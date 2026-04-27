const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { BusinessError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /users - Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;

    let query = db('users')
      .select([
        'id',
        'name',
        'email',
        'phone',
        'role',
        'is_active',
        'created_at',
        'updated_at'
      ]);

    // Apply filters
    if (role) {
      query = query.where('role', role);
    }

    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
            .orWhere('phone', 'ilike', `%${search}%`)
            .orWhere('email', 'ilike', `%${search}%`);
      });
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('* as total');
    const [{ total }] = await countQuery;

    // Get paginated results
    const users = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        users,
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
        message: 'Failed to fetch users'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /users/:id - Get user details (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db('users')
      .select([
        'id',
        'name',
        'email',
        'phone',
        'role',
        'is_active',
        'created_at',
        'updated_at'
      ])
      .where('id', id)
      .first();

    if (!user) {
      throw new BusinessError('User not found', 'NOT_FOUND', 404);
    }

    // Get delivery statistics for delivery agents
    if (user.role === 'delivery_agent') {
      const stats = await db('deliveries')
        .where('delivery_agent_id', id)
        .select(
          db.raw('COUNT(*) as total_deliveries'),
          db.raw('COALESCE(SUM(litres), 0) as total_litres'),
          db.raw('COALESCE(SUM(total_amount), 0) as total_value')
        )
        .first();

      user.stats = {
        total_deliveries: parseInt(stats.total_deliveries) || 0,
        total_litres: parseFloat(stats.total_litres) || 0,
        total_value: parseFloat(stats.total_value) || 0
      };
    }

    res.json({
      success: true,
      data: { user },
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
        message: 'Failed to fetch user'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /users - Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, validateRequest(schemas.createUser), async (req, res) => {
  try {
    const { name, phone, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await db('users')
      .where('phone', phone)
      .orWhere('email', email)
      .first();

    if (existingUser) {
      throw new BusinessError('User with this phone or email already exists', 'DUPLICATE_RESOURCE', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Create user
    const [user] = await db('users')
      .insert({
        id: uuidv4(),
        name,
        phone,
        email,
        password: hashedPassword,
        role,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning([
        'id',
        'name',
        'email',
        'phone',
        'role',
        'is_active',
        'created_at',
        'updated_at'
      ]);

    res.status(201).json({
      success: true,
      data: { user },
      message: 'User created successfully',
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
        message: 'Failed to create user'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /users/:id - Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if user exists
    const user = await db('users')
      .where('id', id)
      .first();

    if (!user) {
      throw new BusinessError('User not found', 'NOT_FOUND', 404);
    }

    // Prevent self-deactivation
    if (updates.is_active === false && id === req.user.id) {
      throw new BusinessError('Cannot deactivate your own account', 'BUSINESS_RULE_ERROR', 400);
    }

    // Check for duplicates if phone or email is being updated
    if (updates.phone || updates.email) {
      const existingUser = await db('users')
        .where('id', '!=', id)
        .where(function() {
          if (updates.phone) this.orWhere('phone', updates.phone);
          if (updates.email) this.orWhere('email', updates.email);
        })
        .first();

      if (existingUser) {
        throw new BusinessError('User with this phone or email already exists', 'DUPLICATE_RESOURCE', 409);
      }
    }

    // Hash password if being updated
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    }

    // Update user
    updates.updated_at = new Date();
    const [updatedUser] = await db('users')
      .where('id', id)
      .update(updates)
      .returning([
        'id',
        'name',
        'email',
        'phone',
        'role',
        'is_active',
        'created_at',
        'updated_at'
      ]);

    res.json({
      success: true,
      data: { user: updatedUser },
      message: 'User updated successfully',
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
        message: 'Failed to update user'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /users/:id - Deactivate user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await db('users')
      .where('id', id)
      .first();

    if (!user) {
      throw new BusinessError('User not found', 'NOT_FOUND', 404);
    }

    // Prevent self-deactivation
    if (id === req.user.id) {
      throw new BusinessError('Cannot deactivate your own account', 'BUSINESS_RULE_ERROR', 400);
    }

    // Deactivate user
    await db('users')
      .where('id', id)
      .update({
        is_active: false,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'User deactivated successfully',
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
        message: 'Failed to deactivate user'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
