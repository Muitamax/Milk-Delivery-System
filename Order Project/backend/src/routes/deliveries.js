const express = require('express');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const db = require('../config/database');
const { authenticateToken, requireDeliveryAgent } = require('../middleware/auth');
const { validateRequest, validateQuery, schemas, querySchemas } = require('../middleware/validation');
const { BusinessError } = require('../middleware/errorHandler');
const { generateDeliveryId } = require('../utils/helpers');
const SMSService = require('../services/smsService');
const TransactionService = require('../services/transactionService');

const router = express.Router();

// POST /deliveries - Create new delivery (atomic transaction)
router.post('/', authenticateToken, requireDeliveryAgent, validateRequest(schemas.createDelivery), async (req, res) => {
  const trx = await db.transaction();
  
  try {
    const { customer_id, litres, customer_confirmation } = req.body;
    const delivery_agent_id = req.user.id;

    // Get customer and lock row for update
    const customer = await trx('customers')
      .where('id', customer_id)
      .where('is_active', true)
      .forUpdate()
      .first();

    if (!customer) {
      throw new BusinessError('Customer not found or inactive', 'NOT_FOUND', 404);
    }

    // Calculate amounts
    const total_amount = parseFloat((litres * customer.price_per_litre).toFixed(2));
    const previous_balance = parseFloat(customer.outstanding_balance);
    const new_balance = parseFloat((previous_balance + total_amount).toFixed(2));

    // Generate delivery ID
    const delivery_id = generateDeliveryId();

    // Create delivery record
    const [delivery] = await trx('deliveries')
      .insert({
        id: uuidv4(),
        customer_id,
        delivery_agent_id,
        litres,
        price_per_litre: customer.price_per_litre,
        total_amount,
        previous_balance,
        new_balance,
        delivery_id,
        delivery_timestamp: new Date(),
        status: 'confirmed',
        customer_confirmation_method: customer_confirmation?.method || null,
        customer_confirmation_data: customer_confirmation?.data || null,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    // Update customer balance
    await trx('customers')
      .where('id', customer_id)
      .update({
        outstanding_balance: new_balance,
        last_delivery_at: new Date(),
        updated_at: new Date()
      });

    // Create transaction record
    await trx('transactions')
      .insert({
        id: uuidv4(),
        customer_id,
        transaction_type: 'delivery',
        delivery_id: delivery.id,
        amount: total_amount,
        balance_before: previous_balance,
        balance_after: new_balance,
        description: `Delivery of ${litres}L @ Ksh ${customer.price_per_litre}/L`,
        created_by: delivery_agent_id,
        transaction_timestamp: new Date(),
        created_at: new Date()
      });

    // Commit transaction
    await trx.commit();

    // Send SMS (async - don't block response)
    setImmediate(async () => {
      try {
        await SMSService.sendDeliveryConfirmation(customer, delivery);
      } catch (smsError) {
        console.error('SMS delivery failed:', smsError);
      }
    });

    res.status(201).json({
      success: true,
      data: {
        delivery: {
          id: delivery.id,
          delivery_id: delivery.delivery_id,
          customer_id: delivery.customer_id,
          litres: delivery.litres,
          price_per_litre: delivery.price_per_litre,
          total_amount: delivery.total_amount,
          previous_balance: delivery.previous_balance,
          new_balance: delivery.new_balance,
          delivery_timestamp: delivery.delivery_timestamp,
          status: delivery.status
        },
        customer: {
          outstanding_balance: new_balance
        },
        receipt_url: `${req.protocol}://${req.get('host')}/api/v1/deliveries/${delivery.id}/receipt`
      },
      message: 'Delivery recorded successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await trx.rollback();
    
    if (error.name === 'BusinessError') {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create delivery'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /deliveries - Get deliveries (filtered by user role)
router.get('/', authenticateToken, validateQuery(querySchemas.pagination), async (req, res) => {
  try {
    const { page = 1, limit = 20, customer_id, date_from, date_to, status } = req.query;
    const offset = (page - 1) * limit;

    let query = db('deliveries')
      .select([
        'deliveries.*',
        'customers.name as customer_name',
        'customers.phone as customer_phone',
        'users.name as delivery_agent_name'
      ])
      .join('customers', 'deliveries.customer_id', 'customers.id')
      .join('users', 'deliveries.delivery_agent_id', 'users.id');

    // Apply role-based filtering
    if (req.user.role === 'delivery_agent') {
      query = query.where('deliveries.delivery_agent_id', req.user.id);
    }

    // Apply filters
    if (customer_id) {
      query = query.where('deliveries.customer_id', customer_id);
    }

    if (date_from) {
      query = query.where('deliveries.delivery_timestamp', '>=', moment(date_from).startOf('day').toDate());
    }

    if (date_to) {
      query = query.where('deliveries.delivery_timestamp', '<=', moment(date_to).endOf('day').toDate());
    }

    if (status) {
      query = query.where('deliveries.status', status);
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('* as total');
    const [{ total }] = await countQuery;

    // Get paginated results
    const deliveries = await query
      .orderBy('deliveries.delivery_timestamp', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        deliveries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch deliveries'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /deliveries/:id - Get delivery details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let query = db('deliveries')
      .select([
        'deliveries.*',
        'customers.name as customer_name',
        'customers.phone as customer_phone',
        'customers.paybill_account',
        'users.name as delivery_agent_name'
      ])
      .join('customers', 'deliveries.customer_id', 'customers.id')
      .join('users', 'deliveries.delivery_agent_id', 'users.id')
      .where('deliveries.id', id);

    // Apply role-based filtering
    if (req.user.role === 'delivery_agent') {
      query = query.where('deliveries.delivery_agent_id', req.user.id);
    }

    const delivery = await query.first();

    if (!delivery) {
      throw new BusinessError('Delivery not found', 'NOT_FOUND', 404);
    }

    res.json({
      success: true,
      data: { delivery },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error.name === 'BusinessError') {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch delivery'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /deliveries/:id/receipt - Get printable receipt (HTML format)
router.get('/:id/receipt', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await db('deliveries')
      .select([
        'deliveries.*',
        'customers.name as customer_name',
        'customers.phone as customer_phone',
        'customers.paybill_account',
        'users.name as delivery_agent_name'
      ])
      .join('customers', 'deliveries.customer_id', 'customers.id')
      .join('users', 'deliveries.delivery_agent_id', 'users.id')
      .where('deliveries.id', id)
      .first();

    if (!delivery) {
      throw new BusinessError('Delivery not found', 'NOT_FOUND', 404);
    }

    // Generate HTML receipt
    const receiptHTML = generateReceiptHTML(delivery);

    res.setHeader('Content-Type', 'text/html');
    res.send(receiptHTML);

  } catch (error) {
    if (error.name === 'BusinessError') {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate receipt'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Generate HTML receipt
function generateReceiptHTML(delivery) {
  const businessName = process.env.BUSINESS_NAME || 'Milk Delivery Business';
  const businessPhone = process.env.BUSINESS_PHONE || '+254712345678';
  const businessPaybill = process.env.BUSINESS_PAYBILL || '123456';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Delivery Receipt - ${delivery.delivery_id}</title>
    <style>
        @media print {
            body { width: 80mm; margin: 0; padding: 10px; font-family: monospace; font-size: 12px; }
            .no-print { display: none; }
        }
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .info { margin: 10px 0; }
        .total { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; font-size: 10px; }
        .no-print { text-align: center; margin: 20px 0; }
        button { padding: 10px 20px; font-size: 16px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>${businessName}</h2>
        <p>DELIVERY RECEIPT</p>
    </div>
    
    <div class="info">
        <strong>Receipt No:</strong> ${delivery.delivery_id}<br>
        <strong>Date:</strong> ${moment(delivery.delivery_timestamp).format('DD/MM/YYYY HH:mm')}<br>
        <strong>Customer:</strong> ${delivery.customer_name}<br>
        <strong>Phone:</strong> ${delivery.customer_phone}
    </div>
    
    <div class="info">
        <strong>Delivery Details:</strong><br>
        Litres Delivered: ${delivery.litres} L<br>
        Price per Litre: Ksh ${delivery.price_per_litre}<br>
        Previous Balance: Ksh ${delivery.previous_balance}<br>
        <strong>Charge Amount: Ksh ${delivery.total_amount}</strong><br>
        <strong>New Balance: Ksh ${delivery.new_balance}</strong>
    </div>
    
    <div class="total">
        TOTAL AMOUNT: Ksh ${delivery.total_amount}
    </div>
    
    <div class="info">
        <strong>Payment Details:</strong><br>
        Paybill Number: ${businessPaybill}<br>
        Account Number: ${delivery.paybill_account}<br>
        Phone: ${businessPhone}
    </div>
    
    <div class="footer">
        Thank you for your business!<br>
        ${businessName} - ${businessPhone}
    </div>
    
    <div class="no-print">
        <button onclick="window.print()">Print Receipt</button>
    </div>
    
    <script>
        window.onload = function() {
            if (window.location.hash === '#print') {
                window.print();
            }
        };
    </script>
</body>
</html>`;
}

module.exports = router;
