import type { HttpContext } from '@adonisjs/core/http'
import Playlist from '#models/playlist'
import PlaylistItem from '#models/playlist_item'
import { createPlaylistValidator } from '#validators/playlist'
import string from '@adonisjs/core/helpers/string'

export default class PlaylistsController {
  /**
   * Display a list of resource
   */
  async index({ auth, inertia }: HttpContext) {
    const playlists = await Playlist.query()
      .where('userId', auth.user!.id)
      .orderBy('createdAt', 'desc')
    const cards = await Promise.all(
      playlists.map(async (playlist) => {
        const cover = await PlaylistItem.query()
          .where('playlistId', playlist.id)
          .orderBy('position')
          .first()
        const count = await PlaylistItem.query()
          .where('playlistId', playlist.id)
          .count('* as total')
        return {
          id: playlist.id,
          slug: playlist.slug,
          title: playlist.title,
          description: playlist.description || undefined,
          plays: playlist.plays,
          isPublic: playlist.isPublic,
          accent: playlist.accent,
          cover: cover?.imageUrl,
          itemCount: Number(count[0].$extras.total),
        }
      })
    )
    return inertia.render('dashboard', { playlists: cards })
  }

  /**
   * Display form to create a new record
   */
  async create({ inertia }: HttpContext) {
    return inertia.render('playlists/create', {})
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, auth, response, session }: HttpContext) {
    const payload = await request.validateUsing(createPlaylistValidator)
    const base = string.slug(payload.title) || string.random(8)
    let slug = base
    while (await Playlist.findBy('slug', slug)) slug = `${base}-${string.random(5).toLowerCase()}`
    const playlist = await Playlist.create({
      userId: auth.user!.id,
      title: payload.title,
      description: payload.description || null,
      isPublic: payload.visibility === 'public',
      accent: payload.accent || 'lime',
      slug,
    })
    await PlaylistItem.createMany(
      payload.items.map((item, position) => ({
        playlistId: playlist.id,
        title: item.title,
        description: item.description || null,
        imageUrl: item.imageUrl,
        position,
      }))
    )
    session.flash('success', 'Playlist créée. Elle est prête à être partagée !')
    return response.redirect().toRoute('playlists.show', { slug })
  }

  /**
   * Show individual record
   */
  async show({ params, auth, inertia, response, request }: HttpContext) {
    const playlist = await Playlist.findByOrFail('slug', params.slug)
    if (!playlist.isPublic && playlist.userId !== auth.user?.id) return response.notFound()
    const items = await PlaylistItem.query().where('playlistId', playlist.id).orderBy('position')
    const visitorId = request.cookie('pos_visitor') || string.random(32)
    response.cookie('pos_visitor', visitorId, { httpOnly: true, sameSite: 'lax', maxAge: '1 year' })
    return inertia.render('playlists/show', {
      playlist: {
        slug: playlist.slug,
        title: playlist.title,
        description: playlist.description || undefined,
        accent: playlist.accent as 'lime' | 'violet' | 'coral' | 'sky',
        isPublic: playlist.isPublic,
      },
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        imageUrl: item.imageUrl,
        smashes: item.smashes,
        passes: item.passes,
      })),
      canEdit: playlist.userId === auth.user?.id,
    })
  }

  /**
   * Edit individual record
   */
  async edit({ params, auth, inertia, response }: HttpContext) {
    const playlist = await Playlist.findByOrFail('slug', params.slug)
    if (playlist.userId !== auth.user!.id) return response.forbidden()
    const items = await PlaylistItem.query().where('playlistId', playlist.id).orderBy('position')
    return inertia.render('playlists/edit', {
      playlist: {
        slug: playlist.slug,
        title: playlist.title,
        description: playlist.description || undefined,
        accent: playlist.accent as 'lime' | 'violet' | 'coral' | 'sky',
        isPublic: playlist.isPublic,
      },
      items: items.map((item) => ({
        title: item.title,
        description: item.description || undefined,
        imageUrl: item.imageUrl,
      })),
    })
  }

  /**
   * Handle form submission for the edit action
   */
  async update({ params, request, auth, response, session }: HttpContext) {
    const playlist = await Playlist.findByOrFail('slug', params.slug)
    if (playlist.userId !== auth.user!.id) return response.forbidden()
    const payload = await request.validateUsing(createPlaylistValidator)
    playlist.merge({
      title: payload.title,
      description: payload.description || null,
      isPublic: payload.visibility === 'public',
      accent: payload.accent || 'lime',
    })
    await playlist.save()
    await PlaylistItem.query().where('playlistId', playlist.id).delete()
    await PlaylistItem.createMany(
      payload.items.map((item, position) => ({
        playlistId: playlist.id,
        title: item.title,
        description: item.description || null,
        imageUrl: item.imageUrl,
        position,
      }))
    )
    session.flash('success', 'Modifications enregistrées.')
    return response.redirect().toRoute('playlists.show', { slug: playlist.slug })
  }

  /**
   * Delete record
   */
  async destroy({ params, auth, response, session }: HttpContext) {
    const playlist = await Playlist.findByOrFail('slug', params.slug)
    if (playlist.userId !== auth.user!.id) return response.forbidden()
    await playlist.delete()
    session.flash('success', 'Playlist supprimée.')
    return response.redirect().toRoute('playlists.index')
  }
}
