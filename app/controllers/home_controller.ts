import type { HttpContext } from '@adonisjs/core/http'
import Playlist from '#models/playlist'
import PlaylistItem from '#models/playlist_item'

async function playlistCards(playlists: Playlist[]) {
  return Promise.all(
    playlists.map(async (playlist) => {
      const cover = await PlaylistItem.query()
        .where('playlistId', playlist.id)
        .orderBy('position')
        .first()
      const count = await PlaylistItem.query().where('playlistId', playlist.id).count('* as total')
      return {
        id: playlist.id,
        slug: playlist.slug,
        title: playlist.title,
        description: playlist.description || undefined,
        plays: playlist.plays,
        accent: playlist.accent,
        cover: cover?.imageUrl,
        itemCount: Number(count[0].$extras.total),
      }
    })
  )
}

export default class HomeController {
  async index({ inertia }: HttpContext) {
    const playlists = await Playlist.query()
      .where('isPublic', true)
      .orderBy('createdAt', 'desc')
      .limit(6)
    return inertia.render('home', { featured: await playlistCards(playlists) })
  }

  async explore({ inertia }: HttpContext) {
    const playlists = await Playlist.query().where('isPublic', true).orderBy('plays', 'desc')
    return inertia.render('explore', { playlists: await playlistCards(playlists) })
  }

  async robots({ response }: HttpContext) {
    response.type('text/plain').send('User-agent: *\nAllow: /\nSitemap: /sitemap.xml')
  }

  async sitemap({ response }: HttpContext) {
    const playlists = await Playlist.query().where('isPublic', true).select(['slug'])
    const urls = ['/', '/explore', ...playlists.map((playlist) => `/p/${playlist.slug}`)]
    response
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`
      )
  }
}
