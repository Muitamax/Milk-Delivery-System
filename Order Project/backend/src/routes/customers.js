const express = require('express');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/database');
const { authenticateToken, requireAdmin, requireDeliveryAgent } = require('../middleware/auth');
const { validateRequest, validateQuery, schemas, querySchemas } = require('../middleware/validation');
const { BusinessError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /customers - Get all customers (admin only)
router.get('/', authenticateToken, requireAdmin, validateQuery(querySchemas.pagination), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    let query = db('customers')
      .select([
        'id',
        'name',
        'phone',
        'paybill_account',
        'price_per_litre',
        'outstanding_balance',
        'is_active',
        'notes',
        'last_delivery_at',
        'last_payment_at',
        'created_at',
        'updated_at'
      ]);

    // Apply filters
    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
            .orWhere('phone', 'ilike', `%${search}%`);
      });
    }

    if (status) {
      query = query.where('is_active', status === 'active');
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('* as total');
    const [{ total }] = await countQuery;

    // Get paginated results
    const customers = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        customers,
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
        message: 'Failed to fetch customers'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /customers/search - Search customers for delivery (delivery agent)
router.get('/search', authenticateToken, requireDeliveryAgent, validateQuery(querySchemas.customerSearch), async (req, res) => {
  try {
    const { q } = req.query;

    const customers = await db('customers')
      .select([
        'id',
        'name',
        'phone',
        'paybill_account',
        'price_per_litre',
        'outstanding_balance'
      ])
      .where('is_active', true)
      .where(function() {
        this.where('name', 'ilike', `%${q}%`)
            .orWhere('phone', 'ilike', `%${q}%`);
      })
      .orderBy('name')
      .limit(10);

    res.json({
      success: true,
      data: { customers },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Search failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /customers/:id - Get customer details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await db('customers')
      .where('id', id)
      .first();

    if (!customer) {
      throw new BusinessError('Customer not found', 'NOT_FOUND', 404);
    }

    // Get recent transactions
    const recentTransactions = await db('transactions')
      .select([
        'id',
        'transaction_type',
        'amount',
        'balance_before',
        'balance_after',
        'description',
        'transaction_timestamp'
      ])
      .where('customer_id', id)
      .orderBy('transaction_timestamp', 'desc')
      .limit(5);

    res.json({
      success: true,
      data: {
        customer,
        recentTransactions
      },
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
        message: 'Failed to fetch customer'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /customers - Create new customer (admin only)
router.post('/', authenticateToken, requireAdmin, validateRequest(schemas.createCustomer), async (req, res) => {
  try {
    const { name, phone, paybill_account, price_per_litre, notes } = req.body;

    // Check if phone or paybill account already exists
    const existingCustomer = await db('customers')
      .where('phone', phone)
      .orWhere('paybill_account', paybill_account)
      .first();

    if (existingCustomer) {
      throw new BusinessError('Customer with this phone or paybill account already exists', 'DUPLICATE_RESOURCE', 409);
    }

    // Create customer
    const [customer] = await db('customers')
      .insert({
        id: uuidv4(),
        name,
        phone,
        paybill_account,
        price_per_litre,
        outstanding_balance: 0.00,
        is_active: true,
        notes: notes || null,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    res.status(201).json({
      success: true,
      data: { customer },
      message: 'Customer created successfully',
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
        message: 'Failed to create customer'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /customers/:id - Update customer (admin only)
router.put('/:id', authenticateToken, requireAdmin, validateRequest(schemas.updateCustomer), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if customer exists
    const customer = await db('customers')
      .where('id', id)
      .first();

    if (!customer) {
      throw new BusinessError('Customer not found', 'NOT_FOUND', 404);
    }

    // Check for duplicates if phone or paybill_account is being updated
    if (updates.phone || updates.paybill_account) {
      const existingCustomer = await db('customers')
        .where('id', '!=', id)
        .where(function() {
          if (updates.phone) this.orWhere('phone', updates.phone);
          if (updates.paybill_account) this.orWhere('paybill_account', updates.paybill_account);
        })
        .first();

      if (existingCustomer) {
        throw new BusinessError('Customer with this phone or paybill account already exists', 'DUPLICATE_RESOURCE', 409);
      }
    }

    // Update customer
    updates.updated_at = new Date();
    const [updatedCustomer] = await db('customers')
      .where('id', id)
      .update(updates)
      .returning('*');

    res.json({
      success: true,
      data: { customer: updatedCustomer },
      message: 'Customer updated successfully',
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
        message: 'Failed to update customer'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /customers/:id - Deactivate customer (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const customer = await db('customers')
      .where('id', id)
      .first();

    if (!customer) {
      throw new BusinessError('Customer not found', 'NOT_FOUND', 404);
    }

    // Deactivate customer
    await db('customers')
      .where('id', id)
      .update({
        is_active: false,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Customer deactivated successfully',
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
        message: 'Failed to deactivate customer'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
