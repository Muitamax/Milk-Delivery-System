const express = require('express');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { BusinessError } = require('../middleware/errorHandler');
const TransactionService = require('../services/transactionService');
const SMSService = require('../services/smsService');

const router = express.Router();

// POST /adjustments - Create balance adjustment (admin only)
router.post('/', authenticateToken, requireAdmin, validateRequest(schemas.createAdjustment), async (req, res) => {
  const trx = await db.transaction();
  
  try {
    const { customer_id, adjustment_amount, reason } = req.body;
    const admin_id = req.user.id;

    // Get customer and lock row for update
    const customer = await trx('customers')
      .where('id', customer_id)
      .where('is_active', true)
      .forUpdate()
      .first();

    if (!customer) {
      throw new BusinessError('Customer not found or inactive', 'NOT_FOUND', 404);
    }

    // Calculate new balance
    const previous_balance = parseFloat(customer.outstanding_balance);
    const new_balance = Math.max(0, previous_balance + adjustment_amount);

    // Create adjustment record
    const [adjustment] = await trx('balance_adjustments')
      .insert({
        id: uuidv4(),
        customer_id,
        admin_id,
        adjustment_amount,
        balance_before: previous_balance,
        balance_after: new_balance,
        reason,
        status: 'approved',
        adjustment_timestamp: new Date(),
        created_at: new Date()
      })
      .returning('*');

    // Update customer balance
    await trx('customers')
      .where('id', customer_id)
      .update({
        outstanding_balance: new_balance,
        updated_at: new Date()
      });

    // Create transaction record
    await TransactionService.createTransaction(
      customer_id,
      'adjustment',
      adjustment_amount,
      previous_balance,
      new_balance,
      `Balance adjustment: ${reason}`,
      admin_id
    );

    await trx.commit();

    // Send SMS notification if significant adjustment
    if (Math.abs(adjustment_amount) >= 100) {
      setImmediate(async () => {
        try {
          const message = `Your balance has been adjusted by Ksh ${Math.abs(adjustment_amount)}. Reason: ${reason}. New balance: Ksh ${new_balance}.`;
          await SMSService.sendSMS(customer.phone, message);
        } catch (smsError) {
          console.error('Failed to send adjustment SMS:', smsError);
        }
      });
    }

    res.status(201).json({
      success: true,
      data: { adjustment },
      message: 'Balance adjustment created successfully',
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
        message: 'Failed to create balance adjustment'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /adjustments - Get balance adjustments (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, customer_id, status, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    let query = db('balance_adjustments')
      .select([
        'balance_adjustments.*',
        'customers.name as customer_name',
        'customers.phone as customer_phone',
        'admins.name as admin_name'
      ])
      .join('customers', 'balance_adjustments.customer_id', 'customers.id')
      .join('users as admins', 'balance_adjustments.admin_id', 'admins.id');

    // Apply filters
    if (customer_id) {
      query = query.where('balance_adjustments.customer_id', customer_id);
    }

    if (status) {
      query = query.where('balance_adjustments.status', status);
    }

    if (date_from) {
      query = query.where('balance_adjustments.adjustment_timestamp', '>=', date_from);
    }

    if (date_to) {
      query = query.where('balance_adjustments.adjustment_timestamp', '<=', date_to);
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('* as total');
    const [{ total }] = await countQuery;

    // Get paginated results
    const adjustments = await query
      .orderBy('balance_adjustments.adjustment_timestamp', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        adjustments,
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
        message: 'Failed to fetch balance adjustments'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /adjustments/:id - Get adjustment details (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const adjustment = await db('balance_adjustments')
      .select([
        'balance_adjustments.*',
        'customers.name as customer_name',
        'customers.phone as customer_phone',
        'admins.name as admin_name'
      ])
      .join('customers', 'balance_adjustments.customer_id', 'customers.id')
      .join('users as admins', 'balance_adjustments.admin_id', 'admins.id')
      .where('balance_adjustments.id', id)
      .first();

    if (!adjustment) {
      throw new BusinessError('Adjustment not found', 'NOT_FOUND', 404);
    }

    res.json({
      success: true,
      data: { adjustment },
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
        message: 'Failed to fetch adjustment'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
