const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        },
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
};

const schemas = {
  login: Joi.object({
    phone: Joi.string()
      .pattern(/^\+254\d{9}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be in format +254XXXXXXXXX'
      }),
    password: Joi.string()
      .min(6)
      .required()
  }),

  createCustomer: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required(),
    phone: Joi.string()
      .pattern(/^\+254\d{9}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be in format +254XXXXXXXXX'
      }),
    paybill_account: Joi.string()
      .pattern(/^\d{1,10}$/)
      .required()
      .messages({
        'string.pattern.base': 'Paybill account must be numeric (max 10 digits)'
      }),
    price_per_litre: Joi.number()
      .positive()
      .precision(2)
      .min(1)
      .max(1000)
      .required(),
    notes: Joi.string()
      .max(500)
      .optional()
  }),

  createDelivery: Joi.object({
    customer_id: Joi.string()
      .uuid()
      .required(),
    litres: Joi.number()
      .positive()
      .precision(2)
      .max(1000)
      .required(),
    customer_confirmation: Joi.object({
      method: Joi.string()
        .valid('pin', 'signature', 'ussd')
        .optional(),
      data: Joi.string()
        .max(100)
        .optional()
    }).optional()
  }),

  createUser: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required(),
    phone: Joi.string()
      .pattern(/^\+254\d{9}$/)
      .required(),
    email: Joi.string()
      .email()
      .optional(),
    password: Joi.string()
      .min(6)
      .required(),
    role: Joi.string()
      .valid('admin', 'delivery_agent')
      .required()
  }),

  createAdjustment: Joi.object({
    customer_id: Joi.string()
      .uuid()
      .required(),
    adjustment_amount: Joi.number()
      .precision(2)
      .required(),
    reason: Joi.string()
      .min(5)
      .max(500)
      .required()
  }),

  sendSMS: Joi.object({
    customer_id: Joi.string()
      .uuid()
      .required(),
    message: Joi.string()
      .min(1)
      .max(160)
      .required()
  }),

  updateCustomer: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .optional(),
    phone: Joi.string()
      .pattern(/^\+254\d{9}$/)
      .optional(),
    paybill_account: Joi.string()
      .pattern(/^\d{1,10}$/)
      .optional(),
    price_per_litre: Joi.number()
      .positive()
      .precision(2)
      .min(1)
      .max(1000)
      .optional(),
    is_active: Joi.boolean()
      .optional(),
    notes: Joi.string()
      .max(500)
      .optional()
  })
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        },
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
};

const querySchemas = {
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
  }),

  customerSearch: Joi.object({
    q: Joi.string()
      .min(2)
      .max(50)
      .required()
  }),

  dateRange: Joi.object({
    date_from: Joi.date()
      .iso()
      .optional(),
    date_to: Joi.date()
      .iso()
      .min(Joi.ref('date_from'))
      .optional()
  })
};

module.exports = {
  validateRequest,
  validateQuery,
  schemas,
  querySchemas
};
