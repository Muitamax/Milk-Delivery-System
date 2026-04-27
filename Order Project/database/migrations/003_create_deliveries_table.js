exports.up = function(knex) {
  return knex.schema.createTable('deliveries', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    table.uuid('delivery_agent_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('litres', 8, 2).notNullable();
    table.decimal('price_per_litre', 10, 2).notNullable();
    table.decimal('total_amount', 12, 2).notNullable();
    table.decimal('previous_balance', 12, 2).notNullable();
    table.decimal('new_balance', 12, 2).notNullable();
    table.string('delivery_id').unique().notNullable(); // Human-readable ID
    table.timestamp('delivery_timestamp').notNullable().defaultTo(knex.fn.now());
    table.enum('status', ['confirmed', 'acknowledged', 'disputed']).defaultTo('confirmed');
    table.text('customer_confirmation_method').nullable(); // PIN, signature, USSD
    table.text('customer_confirmation_data').nullable(); // Actual confirmation data
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Critical: Prevent any updates after confirmation
    table.check('?? = ?', ['updated_at', 'created_at'], {constraint: 'immutable_after_creation'});
    
    // Indexes for performance
    table.index(['customer_id']);
    table.index(['delivery_agent_id']);
    table.index(['delivery_id']);
    table.index(['delivery_timestamp']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('deliveries');
};
