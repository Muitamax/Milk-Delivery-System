exports.up = function(knex) {
  return knex.schema.createTable('customers', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('phone').unique().notNullable();
    table.string('paybill_account').unique().notNullable();
    table.decimal('price_per_litre', 10, 2).notNullable().defaultTo(50.00);
    table.decimal('outstanding_balance', 12, 2).notNullable().defaultTo(0.00);
    table.boolean('is_active').defaultTo(true);
    table.text('notes').nullable();
    table.timestamp('last_delivery_at').nullable();
    table.timestamp('last_payment_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['phone']);
    table.index(['paybill_account']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('customers');
};
