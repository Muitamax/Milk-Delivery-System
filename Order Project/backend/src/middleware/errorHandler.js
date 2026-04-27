const logger = require('./logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
  });

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'Resource already exists'
      },
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Referenced resource does not exist'
      },
      timestamp: new Date().toISOString()
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid token'
      },
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Token expired'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Business logic errors
  if (err.name === 'BusinessError') {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: {
        code: err.code || 'BUSINESS_RULE_ERROR',
        message: err.message
      },
      timestamp: new Date().toISOString()
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An internal error occurred' 
        : err.message
    },
    timestamp: new Date().toISOString()
  });
};

class BusinessError extends Error {
  constructor(message, code = 'BUSINESS_RULE_ERROR', statusCode = 400) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

module.exports = {
  errorHandler,
  BusinessError
};
