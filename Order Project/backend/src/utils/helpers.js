const moment = require('moment');

const generateDeliveryId = () => {
  const date = moment().format('YYYYMMDD');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `DLV${date}${random}`;
};

const validatePhoneNumber = (phone) => {
  // Validate Kenyan phone numbers
  const kenyanPhoneRegex = /^\+254\d{9}$/;
  return kenyanPhoneRegex.test(phone);
};

const formatPhoneNumber = (phone) => {
  // Convert various formats to +254XXXXXXXXX
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (digits.startsWith('254') && digits.length === 12) {
    return `+254${digits.slice(3)}`;
  } else if (digits.startsWith('0') && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  } else if (digits.length === 9 && !digits.startsWith('0')) {
    return `+254${digits}`;
  }
  
  return phone; // Return original if can't format
};

const validatePaybillAccount = (account) => {
  // Validate paybill account number (numeric, max 10 digits)
  const paybillRegex = /^\d{1,10}$/;
  return paybillRegex.test(account);
};

const calculateAmount = (litres, pricePerLitre) => {
  const amount = parseFloat((litres * pricePerLitre).toFixed(2));
  return amount;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount);
};

const generateUniqueCode = (prefix = 'CODE', length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, ''); // Remove quotes
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const generatePasswordResetToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

const isValidDateRange = (dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) return true;
  
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  
  return from <= to;
};

const paginateResults = (data, page, limit) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return data.slice(startIndex, endIndex);
};

module.exports = {
  generateDeliveryId,
  validatePhoneNumber,
  formatPhoneNumber,
  validatePaybillAccount,
  calculateAmount,
  formatCurrency,
  generateUniqueCode,
  sanitizeInput,
  validateEmail,
  generatePasswordResetToken,
  isValidDateRange,
  paginateResults
};
