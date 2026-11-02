import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class ProfileController {
  async show({ auth, inertia, response }: HttpContext) {
    response
      .header('Cache-Control', 'private, no-store')
      .header('X-Robots-Tag', 'noindex, nofollow')
    const playlists = await db
      .from('playlists')
      .where('user_id', auth.user!.id)
      .count('* as total')
      .first()
    const votes = await db.from('votes').where('user_id', auth.user!.id).count('* as total').first()
    return inertia.render('profile', {
      statistics: { playlists: Number(playlists?.total || 0), votes: Number(votes?.total || 0) },
    })
  }
}
