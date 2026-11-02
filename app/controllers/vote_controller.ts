import type { HttpContext } from '@adonisjs/core/http'
import PlaylistItem from '#models/playlist_item'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import { voteValidator } from '#validators/vote'
import string from '@adonisjs/core/helpers/string'

export default class VoteController {
  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(voteValidator)
    const item = await PlaylistItem.findOrFail(payload.itemId)
    const playlist = await Playlist.findOrFail(item.playlistId)
    if (!playlist.isPublic && playlist.userId !== auth.user?.id) return response.notFound()
    const visitorId = request.cookie('pos_visitor') || string.random(32)
    await db.transaction(async (trx) => {
      const inserted = await trx
        .table('votes')
        .insert({
          playlist_item_id: item.id,
          user_id: auth.user?.id || null,
          visitor_id: visitorId,
          session_id: payload.sessionId,
          is_smash: payload.choice === 'smash',
          created_at: new Date(),
        })
        .onConflict()
        .ignore()
        .returning('id')
      if (inserted.length)
        await trx
          .from('playlist_items')
          .where('id', item.id)
          .increment(payload.choice === 'smash' ? 'smashes' : 'passes', 1)
    })
    response.cookie('pos_visitor', visitorId, { httpOnly: true, sameSite: 'lax', maxAge: '1 year' })
    return response.redirect().back()
  }
}
