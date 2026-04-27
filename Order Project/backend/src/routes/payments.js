const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const axios = require('axios');

const db = require('../config/database');
const { validateRequest, validateQuery, querySchemas } = require('../middleware/validation');
const { BusinessError } = require('../middleware/errorHandler');
const MpesaService = require('../services/mpesaService');
const SMSService = require('../services/smsService');
const TransactionService = require('../services/transactionService');

const router = express.Router();

// POST /payments/mpesa/callback - M-Pesa C2B webhook endpoint
router.post('/mpesa/callback', async (req, res) => {
  const trx = await db.transaction();
  
  try {
    const callbackData = req.body;
    
    // Validate webhook signature (if enabled)
    if (process.env.MPESA_VALIDATE_SIGNATURES === 'true') {
      const isValid = await MpesaService.validateWebhookSignature(req);
      if (!isValid) {
        throw new BusinessError('Invalid webhook signature', 'WEBHOOK_VALIDATION_ERROR', 401);
      }
    }

    // Extract payment details
    const {
      TransactionType,
      TransID: mpesaTransactionId,
      TransTime,
      TransAmount: amount,
      BusinessShortCode,
      BillRefNumber: accountNumber,
      PhoneNumber: phoneNumber
    } = callbackData;

    // Check for duplicate transaction
    const existingPayment = await trx('payments')
      .where('mpesa_transaction_id', mpesaTransactionId)
      .first();

    if (existingPayment) {
      await trx.rollback();
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Transaction already processed'
      });
    }

    // Find customer by account number
    const customer = await trx('customers')
      .where('paybill_account', accountNumber)
      .where('is_active', true)
      .first();

    let paymentStatus = 'matched';
    let paymentId = uuidv4();

    if (!customer) {
      paymentStatus = 'unmatched';
      console.warn(`Unmatched payment: Account ${accountNumber}, Amount ${amount}, Transaction ${mpesaTransactionId}`);
    } else {
      // Process payment for matched customer
      const previousBalance = parseFloat(customer.outstanding_balance);
      const paymentAmount = parseFloat(amount);
      const newBalance = Math.max(0, previousBalance - paymentAmount);

      // Create payment record
      const [payment] = await trx('payments')
        .insert({
          id: paymentId,
          customer_id: customer.id,
          mpesa_transaction_id: mpesaTransactionId,
          mpesa_receipt_number: mpesaTransactionId,
          phone_number: phoneNumber,
          amount: paymentAmount,
          previous_balance: previousBalance,
          new_balance: newBalance,
          payment_timestamp: new Date(),
          status: 'matched',
          callback_data: JSON.stringify(callbackData),
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Update customer balance
      await trx('customers')
        .where('id', customer.id)
        .update({
          outstanding_balance: newBalance,
          last_payment_at: new Date(),
          updated_at: new Date()
        });

      // Create transaction record
      await TransactionService.createTransaction(
        customer.id,
        'payment',
        -paymentAmount, // Negative for payments
        previousBalance,
        newBalance,
        `M-Pesa payment - ${mpesaTransactionId}`,
        null, // System generated
        payment.id
      );

      // Send SMS confirmation (async)
      setImmediate(async () => {
        try {
          await SMSService.sendPaymentConfirmation(customer, payment);
        } catch (smsError) {
          console.error('Failed to send payment confirmation SMS:', smsError);
        }
      });
    }

    // Log unmatched payments
    if (paymentStatus === 'unmatched') {
      await trx('payments')
        .insert({
          id: paymentId,
          customer_id: null,
          mpesa_transaction_id: mpesaTransactionId,
          mpesa_receipt_number: mpesaTransactionId,
          phone_number: phoneNumber,
          amount: parseFloat(amount),
          previous_balance: 0,
          new_balance: 0,
          payment_timestamp: new Date(),
          status: 'unmatched',
          callback_data: JSON.stringify(callbackData),
          created_at: new Date(),
          updated_at: new Date()
        });
    }

    await trx.commit();

    // Always return success to M-Pesa to avoid retries
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Payment processed successfully'
    });

  } catch (error) {
    await trx.rollback();
    
    console.error('M-Pesa callback processing failed:', error);
    
    // Still return success to M-Pesa to avoid retries
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Payment received'
    });
  }
});

// GET /payments - Get payments (admin only)
router.get('/', require('../middleware/auth').requireAdmin, validateQuery(querySchemas.pagination), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    let query = db('payments')
      .select([
        'payments.*',
        'customers.name as customer_name',
        'customers.phone as customer_phone'
      ])
      .leftJoin('customers', 'payments.customer_id', 'customers.id');

    // Apply filters
    if (status) {
      query = query.where('payments.status', status);
    }

    if (date_from) {
      query = query.where('payments.payment_timestamp', '>=', date_from);
    }

    if (date_to) {
      query = query.where('payments.payment_timestamp', '<=', date_to);
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('* as total');
    const [{ total }] = await countQuery;

    // Get paginated results
    const payments = await query
      .orderBy('payments.payment_timestamp', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        payments,
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
        message: 'Failed to fetch payments'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /payments/unmatched - Get unmatched payments for manual reconciliation (admin only)
router.get('/unmatched', require('../middleware/auth').requireAdmin, async (req, res) => {
  try {
    const unmatchedPayments = await db('payments')
      .select([
        'id',
        'mpesa_transaction_id',
        'mpesa_receipt_number',
        'phone_number',
        'amount',
        'payment_timestamp',
        'callback_data'
      ])
      .where('status', 'unmatched')
      .orderBy('payment_timestamp', 'desc');

    res.json({
      success: true,
      data: { payments: unmatchedPayments },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch unmatched payments'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /payments/:payment_id/match - Manually match payment to customer (admin only)
router.post('/:payment_id/match', require('../middleware/auth').requireAdmin, async (req, res) => {
  const trx = await db.transaction();
  
  try {
    const { payment_id } = req.params;
    const { customer_id } = req.body;

    // Get payment details
    const payment = await trx('payments')
      .where('id', payment_id)
      .where('status', 'unmatched')
      .first();

    if (!payment) {
      throw new BusinessError('Payment not found or already matched', 'NOT_FOUND', 404);
    }

    // Get customer details
    const customer = await trx('customers')
      .where('id', customer_id)
      .where('is_active', true)
      .first();

    if (!customer) {
      throw new BusinessError('Customer not found or inactive', 'NOT_FOUND', 404);
    }

    // Process payment
    const previousBalance = parseFloat(customer.outstanding_balance);
    const newBalance = Math.max(0, previousBalance - payment.amount);

    // Update payment record
    await trx('payments')
      .where('id', payment_id)
      .update({
        customer_id: customer_id,
        previous_balance: previousBalance,
        new_balance: newBalance,
        status: 'matched',
        updated_at: new Date()
      });

    // Update customer balance
    await trx('customers')
      .where('id', customer_id)
      .update({
        outstanding_balance: newBalance,
        last_payment_at: new Date(),
        updated_at: new Date()
      });

    // Create transaction record
    await TransactionService.createTransaction(
      customer_id,
      'payment',
      -payment.amount,
      previousBalance,
      newBalance,
      `M-Pesa payment (manual match) - ${payment.mpesa_transaction_id}`,
      req.user.id,
      payment_id
    );

    await trx.commit();

    res.json({
      success: true,
      message: 'Payment matched successfully',
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
        message: 'Failed to match payment'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
