exports.up = function(knex) {
  return knex.schema.createTable('balance_adjustments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    table.uuid('admin_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('adjustment_amount', 12, 2).notNullable(); // Can be positive or negative
    table.decimal('balance_before', 12, 2).notNullable();
    table.decimal('balance_after', 12, 2).notNullable();
    table.text('reason').notNullable();
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('approved');
    table.timestamp('adjustment_timestamp').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['customer_id']);
    table.index(['admin_id']);
    table.index(['status']);
    table.index(['adjustment_timestamp']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('balance_adjustments');
};
