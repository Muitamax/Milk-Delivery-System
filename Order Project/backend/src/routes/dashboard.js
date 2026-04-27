const express = require('express');
const moment = require('moment');

const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /dashboard/metrics - Get dashboard metrics (admin only)
router.get('/metrics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = moment().startOf('day').toDate();
    const weekStart = moment().startOf('isoWeek').toDate();

    // Today's metrics
    const todayMetrics = await db('deliveries')
      .where('delivery_timestamp', '>=', today)
      .select(
        db.raw('COUNT(*) as total_deliveries'),
        db.raw('COALESCE(SUM(litres), 0) as total_litres'),
        db.raw('COALESCE(SUM(total_amount), 0) as total_value')
      )
      .first();

    // Today's payments
    const todayPayments = await db('payments')
      .where('payment_timestamp', '>=', today)
      .where('status', 'matched')
      .sum('amount as total_payments')
      .first();

    // Today's new customers
    const todayCustomers = await db('customers')
      .where('created_at', '>=', today)
      .count('* as new_customers')
      .first();

    // This week's metrics
    const weekMetrics = await db('deliveries')
      .where('delivery_timestamp', '>=', weekStart)
      .select(
        db.raw('COUNT(*) as total_deliveries'),
        db.raw('COALESCE(SUM(litres), 0) as total_litres'),
        db.raw('COALESCE(SUM(total_amount), 0) as total_value')
      )
      .first();

    // This week's payments
    const weekPayments = await db('payments')
      .where('payment_timestamp', '>=', weekStart)
      .where('status', 'matched')
      .sum('amount as total_payments')
      .first();

    // Outstanding balances
    const outstandingTotal = await db('customers')
      .where('is_active', true)
      .sum('outstanding_balance as total')
      .first();

    // Active customers count
    const activeCustomers = await db('customers')
      .where('is_active', true)
      .count('* as count')
      .first();

    // Unmatched payments
    const unmatchedPayments = await db('payments')
      .where('status', 'unmatched')
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: {
        today: {
          total_deliveries: parseInt(todayMetrics.total_deliveries) || 0,
          total_litres: parseFloat(todayMetrics.total_litres) || 0,
          total_value: parseFloat(todayMetrics.total_value) || 0,
          total_payments: parseFloat(todayPayments.total_payments) || 0,
          new_customers: parseInt(todayCustomers.new_customers) || 0
        },
        this_week: {
          total_deliveries: parseInt(weekMetrics.total_deliveries) || 0,
          total_litres: parseFloat(weekMetrics.total_litres) || 0,
          total_value: parseFloat(weekMetrics.total_value) || 0,
          total_payments: parseFloat(weekPayments.total_payments) || 0
        },
        outstanding_total: parseFloat(outstandingTotal.total) || 0,
        active_customers: parseInt(activeCustomers.count) || 0,
        unmatched_payments: parseInt(unmatchedPayments.count) || 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch dashboard metrics'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /dashboard/recent-activity - Get recent activity (admin only)
router.get('/recent-activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = 10;

    // Recent deliveries
    const recentDeliveries = await db('deliveries')
      .select([
        'deliveries.id',
        'deliveries.delivery_id',
        'deliveries.litres',
        'deliveries.total_amount',
        'deliveries.delivery_timestamp',
        'customers.name as customer_name',
        'users.name as delivery_agent_name',
        db.raw("'delivery' as activity_type")
      ])
      .join('customers', 'deliveries.customer_id', 'customers.id')
      .join('users', 'deliveries.delivery_agent_id', 'users.id')
      .orderBy('deliveries.delivery_timestamp', 'desc')
      .limit(limit);

    // Recent payments
    const recentPayments = await db('payments')
      .select([
        'payments.id',
        'payments.mpesa_receipt_number as delivery_id',
        'payments.amount as litres',
        'payments.amount as total_amount',
        'payments.payment_timestamp',
        'customers.name as customer_name',
        db.raw("'M-Pesa' as delivery_agent_name"),
        db.raw("'payment' as activity_type")
      ])
      .leftJoin('customers', 'payments.customer_id', 'customers.id')
      .where('payments.status', 'matched')
      .orderBy('payments.payment_timestamp', 'desc')
      .limit(limit);

    // Combine and sort by timestamp
    const allActivity = [...recentDeliveries, ...recentPayments]
      .sort((a, b) => new Date(b.delivery_timestamp || b.payment_timestamp) - new Date(a.delivery_timestamp || b.payment_timestamp))
      .slice(0, limit);

    res.json({
      success: true,
      data: { activities: allActivity },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch recent activity'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /dashboard/top-customers - Get top customers by volume/value (admin only)
router.get('/top-customers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'month', limit = 10 } = req.query;
    const limitInt = parseInt(limit);

    let dateFilter;
    if (period === 'week') {
      dateFilter = moment().startOf('isoWeek').toDate();
    } else if (period === 'month') {
      dateFilter = moment().startOf('month').toDate();
    } else {
      dateFilter = moment().startOf('year').toDate();
    }

    // Top customers by volume
    const topByVolume = await db('deliveries')
      .select([
        'customers.id',
        'customers.name',
        'customers.phone',
        db.raw('COALESCE(SUM(deliveries.litres), 0) as total_litres'),
        db.raw('COALESCE(SUM(deliveries.total_amount), 0) as total_value'),
        db.raw('COUNT(deliveries.id) as delivery_count')
      ])
      .join('customers', 'deliveries.customer_id', 'customers.id')
      .where('deliveries.delivery_timestamp', '>=', dateFilter)
      .where('customers.is_active', true)
      .groupBy('customers.id', 'customers.name', 'customers.phone')
      .orderBy('total_litres', 'desc')
      .limit(limitInt);

    // Top customers by value
    const topByValue = await db('deliveries')
      .select([
        'customers.id',
        'customers.name',
        'customers.phone',
        db.raw('COALESCE(SUM(deliveries.litres), 0) as total_litres'),
        db.raw('COALESCE(SUM(deliveries.total_amount), 0) as total_value'),
        db.raw('COUNT(deliveries.id) as delivery_count')
      ])
      .join('customers', 'deliveries.customer_id', 'customers.id')
      .where('deliveries.delivery_timestamp', '>=', dateFilter)
      .where('customers.is_active', true)
      .groupBy('customers.id', 'customers.name', 'customers.phone')
      .orderBy('total_value', 'desc')
      .limit(limitInt);

    res.json({
      success: true,
      data: {
        period,
        top_by_volume: topByVolume,
        top_by_value: topByValue
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch top customers'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /dashboard/delivery-trends - Get delivery trends (admin only)
router.get('/delivery-trends', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    let dateFormat, groupBy;
    if (period === 'day') {
      dateFormat = 'YYYY-MM-DD';
      groupBy = db.raw('DATE(delivery_timestamp)');
    } else if (period === 'week') {
      dateFormat = 'YYYY-"W"WW';
      groupBy = db.raw("TO_CHAR(delivery_timestamp, 'YYYY-\"W\"WW')");
    } else {
      dateFormat = 'YYYY-MM';
      groupBy = db.raw("TO_CHAR(delivery_timestamp, 'YYYY-MM')");
    }

    const trends = await db('deliveries')
      .select([
        groupBy.as('period'),
        db.raw('COUNT(*) as delivery_count'),
        db.raw('COALESCE(SUM(litres), 0) as total_litres'),
        db.raw('COALESCE(SUM(total_amount), 0) as total_value')
      ])
      .where('delivery_timestamp', '>=', moment().subtract(12, period).toDate())
      .groupBy(groupBy)
      .orderBy('period', 'asc')
      .limit(12);

    res.json({
      success: true,
      data: {
        period,
        trends: trends.map(trend => ({
          period: trend.period,
          delivery_count: parseInt(trend.delivery_count),
          total_litres: parseFloat(trend.total_litres),
          total_value: parseFloat(trend.total_value)
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch delivery trends'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
