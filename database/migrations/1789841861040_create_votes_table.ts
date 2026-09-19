import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'votes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('playlist_item_id')
        .unsigned()
        .notNullable()
        .references('playlist_items.id')
        .onDelete('CASCADE')
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.string('visitor_id', 64).notNullable()
      table.boolean('is_smash').notNullable()
      table.unique(['playlist_item_id', 'visitor_id'])
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
