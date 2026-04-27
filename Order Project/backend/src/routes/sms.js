const express = require('express');

const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { BusinessError } = require('../middleware/errorHandler');
const SMSService = require('../services/smsService');

const router = express.Router();

// POST /sms/send - Send manual SMS (admin only)
router.post('/send', authenticateToken, requireAdmin, validateRequest(schemas.sendSMS), async (req, res) => {
  try {
    const { customer_id, message } = req.body;

    // Get customer details
    const customer = await db('customers')
      .where('id', customer_id)
      .where('is_active', true)
      .first();

    if (!customer) {
      throw new BusinessError('Customer not found or inactive', 'NOT_FOUND', 404);
    }

    // Send SMS
    const result = await SMSService.sendSMS(customer.phone, message);

    res.json({
      success: true,
      data: {
        sms_id: result.SMSMessageData.Recipients[0].messageId,
        status: result.SMSMessageData.Recipients[0].status
      },
      message: 'SMS sent successfully',
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
        message: 'Failed to send SMS'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /sms/logs - Get SMS delivery logs (admin only)
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date_from, date_to } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;

    const result = await SMSService.getSMSLogs(page, limit, filters);

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
        message: 'Failed to fetch SMS logs'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /sms/stats - Get SMS statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    let dateFilter;
    if (period === 'day') {
      dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (period === 'week') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const stats = await db('sms_logs')
      .where('created_at', '>=', dateFilter)
      .select(
        db.raw('COUNT(*) as total_sent'),
        db.raw('COUNT(CASE WHEN status = \'sent\' THEN 1 END) as successful'),
        db.raw('COUNT(CASE WHEN status = \'failed\' THEN 1 END) as failed'),
        db.raw('COUNT(CASE WHEN status = \'retry\' THEN 1 END) as retried')
      )
      .first();

    const successRate = stats.total_sent > 0 
      ? ((stats.successful / stats.total_sent) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        period,
        total_sent: parseInt(stats.total_sent) || 0,
        successful: parseInt(stats.successful) || 0,
        failed: parseInt(stats.failed) || 0,
        retried: parseInt(stats.retried) || 0,
        success_rate: parseFloat(successRate)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch SMS statistics'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
