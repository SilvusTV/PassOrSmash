import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.timestamp('suspended_at', { useTz: true }).nullable().index()
    })
    this.schema.createTable('admin_audit', (table) => {
      table.uuid('id').primary()
      table.integer('actor_id').nullable().references('users.id').onDelete('SET NULL')
      table.string('action', 80).notNullable()
      table.string('target_type', 20).notNullable()
      table.integer('target_id').notNullable()
      table.jsonb('details').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().index()
    })
  }
  async down() {
    this.schema.dropTable('admin_audit')
    this.schema.alterTable('users', (table) => table.dropColumn('suspended_at'))
  }
}
