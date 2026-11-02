import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('votes', (table) => {
      table.uuid('session_id').nullable()
      table.dropUnique(['playlist_item_id', 'visitor_id'])
    })
    this.schema.raw(`CREATE UNIQUE INDEX votes_item_visitor_session_unique
      ON votes (playlist_item_id, visitor_id, COALESCE(session_id::text, ''))`)
  }
  async down() {
    // Replays cannot fit the original one-vote-per-browser constraint.
    throw new Error('Vote sessions require a data-preserving manual rollback.')
  }
}
