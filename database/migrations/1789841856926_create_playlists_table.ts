import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'playlists'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.string('slug', 120).notNullable().unique()
      table.string('title', 120).notNullable()
      table.text('description').nullable()
      table.boolean('is_public').notNullable().defaultTo(true)
      table.string('accent', 16).notNullable().defaultTo('lime')
      table.integer('plays').unsigned().notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
