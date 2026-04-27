exports.up = function(knex) {
  return knex.schema.createTable('transactions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    table.enum('transaction_type', ['delivery', 'payment', 'adjustment']).notNullable();
    table.uuid('delivery_id').nullable().references('id').inTable('deliveries').onDelete('CASCADE');
    table.uuid('payment_id').nullable().references('id').inTable('payments').onDelete('CASCADE');
    table.decimal('amount', 12, 2).notNullable(); // Positive for deliveries, negative for payments
    table.decimal('balance_before', 12, 2).notNullable();
    table.decimal('balance_after', 12, 2).notNullable();
    table.text('description').notNullable();
    table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('transaction_timestamp').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['customer_id']);
    table.index(['transaction_type']);
    table.index(['transaction_timestamp']);
    table.index(['delivery_id']);
    table.index(['payment_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('transactions');
};
