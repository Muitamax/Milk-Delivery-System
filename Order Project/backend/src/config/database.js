const knex = require('knex');
const path = require('path');

const environment = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '../../database/knexfile.js'))[environment];

const db = knex(config);

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = db;
