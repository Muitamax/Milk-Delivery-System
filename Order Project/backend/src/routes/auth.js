const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/database');
const { validateRequest, schemas } = require('../middleware/validation');
const { BusinessError } = require('../middleware/errorHandler');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /auth/login
router.post('/login', validateRequest(schemas.login), async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find user by phone
    const user = await db('users')
      .where({ phone, is_active: true })
      .first();

    if (!user) {
      throw new BusinessError('Invalid phone or password', 'AUTHENTICATION_ERROR', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new BusinessError('Invalid phone or password', 'AUTHENTICATION_ERROR', 401);
    }

    // Generate token
    const token = generateToken(user.id);

    // Update last login
    await db('users')
      .where({ id: user.id })
      .update({ updated_at: new Date() });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          email: user.email
        }
      },
      message: 'Login successful',
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
        message: 'Login failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new BusinessError('Token required', 'AUTHENTICATION_ERROR', 401);
    }

    // Verify current token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Generate new token
    const newToken = generateToken(decoded.userId);

    res.json({
      success: true,
      data: {
        token: newToken
      },
      message: 'Token refreshed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid token'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /auth/register (admin only - for creating delivery agents)
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, role = 'delivery_agent', email } = req.body;

    // Check if user already exists
    const existingUser = await db('users')
      .where({ phone })
      .first();

    if (existingUser) {
      throw new BusinessError('User with this phone number already exists', 'DUPLICATE_RESOURCE', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Create user
    const [user] = await db('users')
      .insert({
        id: uuidv4(),
        name,
        phone,
        password: hashedPassword,
        role,
        email,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning(['id', 'name', 'phone', 'role', 'email', 'is_active']);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          email: user.email,
          is_active: user.is_active
        }
      },
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
        message: 'Registration failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
