import type { HttpContext } from '@adonisjs/core/http'
import PlaylistItem from '#models/playlist_item'
import Vote from '#models/vote'
import { voteValidator } from '#validators/vote'
import string from '@adonisjs/core/helpers/string'

export default class VoteController {
  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(voteValidator)
    const item = await PlaylistItem.findOrFail(payload.itemId)
    const visitorId = request.cookie('pos_visitor') || string.random(32)
    const existing = await Vote.query()
      .where('playlistItemId', item.id)
      .where('visitorId', visitorId)
      .first()
    if (!existing) {
      await Vote.create({
        playlistItemId: item.id,
        userId: auth.user?.id || null,
        visitorId,
        isSmash: payload.choice === 'smash',
      })
      if (payload.choice === 'smash') item.smashes += 1
      else item.passes += 1
      await item.save()
    }
    response.cookie('pos_visitor', visitorId, { httpOnly: true, sameSite: 'lax', maxAge: '1 year' })
    return response.redirect().back()
  }
}
