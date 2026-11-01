import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('editorial_settings', (t) => {
      t.integer('id').primary()
      t.jsonb('settings').notNullable()
    })
    this.schema.createTable('editorial_connections', (t) => {
      t.uuid('id').primary()
      t.string('subject', 255).notNullable()
      t.string('client_id', 255).notNullable()
      t.integer('user_id').notNullable().references('users.id').onDelete('CASCADE')
      t.jsonb('scopes').notNullable()
      t.timestamp('expires_at', { useTz: true }).notNullable()
      t.boolean('revoked').notNullable().defaultTo(false)
      t.unique(['subject', 'client_id'])
    })
    this.schema.createTable('editorial_jobs', (t) => {
      t.uuid('id').primary()
      t.integer('user_id').notNullable().references('users.id')
      t.string('kind', 30).notNullable()
      t.string('slot_key', 100).unique()
      t.string('status', 20).notNullable().defaultTo('queued')
      t.string('stage', 30).notNullable().defaultTo('queued')
      t.jsonb('input').notNullable()
      t.jsonb('result')
      t.jsonb('error')
      t.integer('attempts').notNullable().defaultTo(0)
      t.timestamp('available_at', { useTz: true }).notNullable()
      t.timestamp('lease_until', { useTz: true })
      t.uuid('lease_token')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).notNullable()
      t.index(['status', 'available_at'])
    })
    this.schema.createTable('editorial_proposals', (t) => {
      t.uuid('id').primary()
      t.integer('user_id').notNullable().references('users.id')
      t.string('status', 20).notNullable().defaultTo('draft')
      t.integer('revision').notNullable().defaultTo(1)
      t.jsonb('content').notNullable()
      t.uuid('job_id').unique().references('editorial_jobs.id')
      t.integer('playlist_id').unique().references('playlists.id').onDelete('SET NULL')
      t.integer('approved_by').references('users.id')
      t.integer('approved_revision')
      t.timestamp('approved_at', { useTz: true })
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).notNullable()
    })
    this.schema.createTable('editorial_revisions', (t) => {
      t.uuid('proposal_id').notNullable().references('editorial_proposals.id')
      t.integer('revision').notNullable()
      t.jsonb('content').notNullable()
      t.primary(['proposal_id', 'revision'])
    })
    this.schema.createTable('editorial_media', (t) => {
      t.uuid('id').primary()
      t.integer('user_id').notNullable().references('users.id')
      t.string('path', 255).notNullable()
      t.jsonb('provenance').notNullable()
      t.integer('width').notNullable()
      t.integer('height').notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
    })
    this.schema.createTable('editorial_operations', (t) => {
      t.string('actor', 255).notNullable()
      t.string('operation', 80).notNullable()
      t.string('key', 120).notNullable()
      t.string('input_hash', 64).notNullable()
      t.jsonb('result').notNullable()
      t.primary(['actor', 'operation', 'key'])
    })
    this.schema.createTable('editorial_audit', (t) => {
      t.bigIncrements('id')
      t.string('actor', 255).notNullable()
      t.string('action', 80).notNullable()
      t.uuid('proposal_id').references('editorial_proposals.id')
      t.integer('revision')
      t.jsonb('details').notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    for (const name of [
      'editorial_audit',
      'editorial_operations',
      'editorial_media',
      'editorial_revisions',
      'editorial_proposals',
      'editorial_jobs',
      'editorial_connections',
      'editorial_settings',
    ]) {
      this.schema.dropTable(name)
    }
  }
}
