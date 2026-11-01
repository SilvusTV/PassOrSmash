import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('mcp_oauth_records', (t) => {
      t.string('model', 50).notNullable()
      t.string('key', 64).notNullable()
      t.text('payload').notNullable()
      t.string('grant_key', 64).index()
      t.string('uid_key', 64).index()
      t.string('user_code_key', 64).index()
      t.timestamp('expires_at', { useTz: true })
      t.timestamp('consumed_at', { useTz: true })
      t.primary(['model', 'key'])
    })
    this.schema.createTable('mcp_oauth_keys', (t) => {
      t.integer('id').primary()
      t.text('jwks').notNullable()
    })
    this.schema.createTable('mcp_oauth_rate_limits', (t) => {
      t.string('key', 64).primary()
      t.integer('count').notNullable()
      t.timestamp('expires_at', { useTz: true }).notNullable().index()
    })
    this.schema.alterTable('editorial_connections', (t) => {
      t.string('oauth_grant_id', 255).nullable().unique()
    })
  }
  async down() {
    this.schema.alterTable('editorial_connections', (t) => t.dropColumn('oauth_grant_id'))
    this.schema.dropTable('mcp_oauth_rate_limits')
    this.schema.dropTable('mcp_oauth_keys')
    this.schema.dropTable('mcp_oauth_records')
  }
}
