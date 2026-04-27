const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Access token required'
      },
      timestamp: new Date().toISOString()
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await db('users')
      .where({ id: decoded.userId, is_active: true })
      .first();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid token or user not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid token'
      },
      timestamp: new Date().toISOString()
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Insufficient permissions'
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

const requireAdmin = requireRole(['admin']);
const requireDeliveryAgent = requireRole(['delivery_agent', 'admin']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireDeliveryAgent
};
