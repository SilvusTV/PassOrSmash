import type { HttpContext } from '@adonisjs/core/http'
import Playlist from '#models/playlist'
import PlaylistItem from '#models/playlist_item'
import { appUrl } from '#config/app'

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

  async about({ inertia }: HttpContext) {
    return inertia.render('about', {})
  }

  async robots({ response }: HttpContext) {
    const origin = appUrl.replace(/\/$/, '')
    response.header('Cache-Control', 'public, max-age=3600')
    response
      .type('text/plain')
      .send(
        `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /playlists/\nDisallow: /auth/\nDisallow: /login\nDisallow: /signup\nSitemap: ${origin}/sitemap.xml`
      )
  }

  async sitemap({ response }: HttpContext) {
    const origin = appUrl.replace(/\/$/, '')
    const playlists = await Playlist.query().where('isPublic', true).select(['slug', 'updatedAt'])
    const staticUrls = [
      { path: '/', priority: '1.0', changefreq: 'weekly' },
      { path: '/jeu-smash-or-pass', priority: '0.9', changefreq: 'monthly' },
      { path: '/explore', priority: '0.9', changefreq: 'daily' },
    ]
    const urls = [
      ...staticUrls.map(
        ({ path, priority, changefreq }) =>
          `<url><loc>${origin}${path}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
      ),
      ...playlists.map(
        (playlist) =>
          `<url><loc>${origin}/p/${encodeURIComponent(playlist.slug)}</loc>${playlist.updatedAt ? `<lastmod>${playlist.updatedAt.toISODate()}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.7</priority></url>`
      ),
    ]
    response
      .header('Cache-Control', 'public, max-age=3600')
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`
      )
  }
}
