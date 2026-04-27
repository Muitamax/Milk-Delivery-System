const express = require('express');

const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateQuery, querySchemas } = require('../middleware/validation');
const TransactionService = require('../services/transactionService');

const router = express.Router();

// GET /transactions/customer/:customer_id - Get customer transaction history
router.get('/customer/:customer_id', authenticateToken, validateQuery(querySchemas.pagination), async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { page = 1, limit = 20, type, date_from, date_to } = req.query;

    // Verify customer exists and user has access
    const customer = await db('customers')
      .where('id', customer_id)
      .first();

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Customer not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get transactions
    const result = await TransactionService.getCustomerTransactions(customer_id, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      dateFrom: date_from,
      dateTo: date_to
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch transactions'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /transactions/summary/:customer_id - Get customer transaction summary
router.get('/summary/:customer_id', authenticateToken, async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { date_from, date_to } = req.query;

    // Verify customer exists
    const customer = await db('customers')
      .where('id', customer_id)
      .first();

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Customer not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get summary
    const summary = await TransactionService.getTransactionSummary(customer_id, date_from, date_to);

    res.json({
      success: true,
      data: {
        customerId: customer_id,
        customerName: customer.name,
        currentBalance: parseFloat(customer.outstanding_balance),
        ...summary
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch transaction summary'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /transactions - Get all transactions (admin only)
router.get('/', authenticateToken, requireAdmin, validateQuery(querySchemas.pagination), async (req, res) => {
  try {
    const { page = 1, limit = 20, type, customer_id, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    let query = db('transactions')
      .select([
        'transactions.*',
        'customers.name as customer_name',
        'customers.phone as customer_phone',
        'users.name as created_by_name'
      ])
      .leftJoin('customers', 'transactions.customer_id', 'customers.id')
      .leftJoin('users', 'transactions.created_by', 'users.id');

    // Apply filters
    if (type) {
      query = query.where('transactions.transaction_type', type);
    }

    if (customer_id) {
      query = query.where('transactions.customer_id', customer_id);
    }

    if (date_from) {
      query = query.where('transactions.transaction_timestamp', '>=', date_from);
    }

    if (date_to) {
      query = query.where('transactions.transaction_timestamp', '<=', date_to);
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('* as total');
    const [{ total }] = await countQuery;

    // Get paginated results
    const transactions = await query
      .orderBy('transactions.transaction_timestamp', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        transactions,
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
        message: 'Failed to fetch transactions'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
