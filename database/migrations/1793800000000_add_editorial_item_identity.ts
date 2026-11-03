import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('playlist_items', (table) => {
      table.uuid('editorial_item_id').nullable()
      table.unique(['playlist_id', 'editorial_item_id'])
    })
    // Keep the identity of existing published elements so editing preserves votes.
    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE playlist_items AS item SET editorial_item_id = (entry.value->>'id')::uuid
        FROM editorial_proposals AS proposal,
          jsonb_array_elements(proposal.content->'items') WITH ORDINALITY AS entry(value, ordinal)
        WHERE item.playlist_id = proposal.playlist_id
          AND item.position = entry.ordinal - 1
          AND entry.value->>'id' IS NOT NULL
      `)
    })
  }
  async down() {
    this.schema.alterTable('playlist_items', (table) => {
      table.dropUnique(['playlist_id', 'editorial_item_id'])
      table.dropColumn('editorial_item_id')
    })
  }
}
