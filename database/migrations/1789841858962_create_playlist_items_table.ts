import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'playlist_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('playlist_id')
        .unsigned()
        .notNullable()
        .references('playlists.id')
        .onDelete('CASCADE')
      table.string('title', 120).notNullable()
      table.text('description').nullable()
      table.string('image_url', 2048).notNullable()
      table.integer('position').unsigned().notNullable().defaultTo(0)
      table.integer('smashes').unsigned().notNullable().defaultTo(0)
      table.integer('passes').unsigned().notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
