exports.up = function(knex) {
  return knex.schema.createTable('payments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    table.string('mpesa_transaction_id').unique().nullable();
    table.string('mpesa_receipt_number').unique().notNullable();
    table.string('phone_number').notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.decimal('previous_balance', 12, 2).notNullable();
    table.decimal('new_balance', 12, 2).notNullable();
    table.timestamp('payment_timestamp').notNullable().defaultTo(knex.fn.now());
    table.enum('status', ['pending', 'matched', 'unmatched', 'failed']).defaultTo('matched');
    table.text('callback_data').nullable(); // Raw M-Pesa callback data
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['customer_id']);
    table.index(['mpesa_receipt_number']);
    table.index(['mpesa_transaction_id']);
    table.index(['status']);
    table.index(['payment_timestamp']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('payments');
};
