import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('discord_id', 32).nullable().unique()
      table.string('avatar_url', 2048).nullable()
      table.string('username', 80).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('discord_id')
      table.dropColumn('avatar_url')
      table.dropColumn('username')
    })
  }
}
