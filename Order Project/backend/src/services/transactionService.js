const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class TransactionService {
  static async createTransaction(customerId, type, amount, balanceBefore, balanceAfter, description, createdBy, relatedId = null) {
    try {
      const transactionData = {
        id: uuidv4(),
        customer_id: customerId,
        transaction_type: type,
        amount: amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: description,
        created_by: createdBy,
        transaction_timestamp: new Date(),
        created_at: new Date()
      };

      // Add related ID based on transaction type
      if (type === 'delivery' && relatedId) {
        transactionData.delivery_id = relatedId;
      } else if (type === 'payment' && relatedId) {
        transactionData.payment_id = relatedId;
      }

      const [transaction] = await db('transactions')
        .insert(transactionData)
        .returning('*');

      return transaction;
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  }

  static async getCustomerTransactions(customerId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        dateFrom,
        dateTo
      } = options;

      const offset = (page - 1) * limit;

      let query = db('transactions')
        .select([
          'id',
          'transaction_type',
          'amount',
          'balance_before',
          'balance_after',
          'description',
          'transaction_timestamp',
          'delivery_id',
          'payment_id'
        ])
        .where('customer_id', customerId);

      // Apply filters
      if (type) {
        query = query.where('transaction_type', type);
      }

      if (dateFrom) {
        query = query.where('transaction_timestamp', '>=', dateFrom);
      }

      if (dateTo) {
        query = query.where('transaction_timestamp', '<=', dateTo);
      }

      // Get total count
      const countQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await countQuery;

      // Get paginated results
      const transactions = await query
        .orderBy('transaction_timestamp', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Failed to fetch customer transactions:', error);
      throw error;
    }
  }

  static async getTransactionSummary(customerId, dateFrom = null, dateTo = null) {
    try {
      let query = db('transactions')
        .where('customer_id', customerId);

      if (dateFrom) {
        query = query.where('transaction_timestamp', '>=', dateFrom);
      }

      if (dateTo) {
        query = query.where('transaction_timestamp', '<=', dateTo);
      }

      const summary = await query
        .select(
          db.raw('COUNT(*) as total_transactions'),
          db.raw('SUM(CASE WHEN transaction_type = \'delivery\' THEN amount ELSE 0 END) as total_deliveries'),
          db.raw('SUM(CASE WHEN transaction_type = \'payment\' THEN ABS(amount) ELSE 0 END) as total_payments'),
          db.raw('SUM(CASE WHEN transaction_type = \'adjustment\' THEN amount ELSE 0 END) as total_adjustments')
        )
        .first();

      return {
        totalTransactions: parseInt(summary.total_transactions),
        totalDeliveries: parseFloat(summary.total_deliveries || 0),
        totalPayments: parseFloat(summary.total_payments || 0),
        totalAdjustments: parseFloat(summary.total_adjustments || 0)
      };

    } catch (error) {
      console.error('Failed to get transaction summary:', error);
      throw error;
    }
  }
}

module.exports = TransactionService;
