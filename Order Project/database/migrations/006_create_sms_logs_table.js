exports.up = function(knex) {
  return knex.schema.createTable('sms_logs', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('customer_id').nullable().references('id').inTable('customers').onDelete('CASCADE');
    table.uuid('delivery_id').nullable().references('id').inTable('deliveries').onDelete('CASCADE');
    table.string('phone_number').notNullable();
    table.text('message').notNullable();
    table.enum('status', ['pending', 'sent', 'failed', 'retry']).defaultTo('pending');
    table.text('api_response').nullable();
    table.integer('retry_count').defaultTo(0);
    table.timestamp('sent_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['customer_id']);
    table.index(['delivery_id']);
    table.index(['status']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('sms_logs');
};
