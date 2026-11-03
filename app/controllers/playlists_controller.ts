import type { HttpContext } from '@adonisjs/core/http'
import Playlist from '#models/playlist'
import PlaylistItem from '#models/playlist_item'
import { createPlaylistValidator, importPlaylistsValidator } from '#validators/playlist'
import string from '@adonisjs/core/helpers/string'
import db from '@adonisjs/lucid/services/db'
import type { ModelAssignOptions } from '@adonisjs/lucid/types/model'
import { playlistsWithActivity } from '#services/playlist_activity'

type PlaylistPayload = Awaited<ReturnType<typeof createPlaylistValidator.validate>>

async function uniqueSlug(title: string, options?: ModelAssignOptions) {
  const base = string.slug(title) || string.random(8).toLowerCase()
  let slug = base
  while (await Playlist.query({ client: options?.client }).where('slug', slug).first())
    slug = `${base}-${string.random(5).toLowerCase()}`
  return slug
}

async function persistPlaylist(
  userId: number,
  payload: PlaylistPayload,
  options?: ModelAssignOptions
) {
  const slug = await uniqueSlug(payload.title, options)
  const playlist = await Playlist.create(
    {
      userId,
      title: payload.title,
      description: payload.description || null,
      isPublic: payload.visibility === 'public',
      accent: payload.accent || 'lime',
      slug,
    },
    options
  )
  await PlaylistItem.createMany(
    payload.items.map((item, position) => ({
      playlistId: playlist.id,
      title: item.title,
      description: item.description || null,
      imageUrl: item.imageUrl,
      position,
    })),
    options
  )
  return playlist
}

export default class PlaylistsController {
  /**
   * Display a list of resource
   */
  async index({ auth, inertia }: HttpContext) {
    const playlists = await playlistsWithActivity()
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
          plays: Number(playlist.$extras.participation_count || 0),
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
  async create({ inertia, request }: HttpContext) {
    return inertia.render('playlists/create', { jsonImport: request.input('json') === 'true' })
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, auth, response, session }: HttpContext) {
    const payload = await request.validateUsing(createPlaylistValidator)
    const playlist = await persistPlaylist(auth.user!.id, payload)
    session.flash('success', 'Playlist créée. Elle est prête à être partagée !')
    return response.redirect().toRoute('playlists.show', { slug: playlist.slug })
  }

  /** Create up to 50 playlists from the opt-in JSON import screen. */
  async import({ request, auth, response, session }: HttpContext) {
    const { playlists } = await request.validateUsing(importPlaylistsValidator)
    await db.transaction(async (trx) => {
      for (const payload of playlists)
        await persistPlaylist(auth.user!.id, payload, { client: trx })
    })
    session.flash(
      'success',
      `${playlists.length} playlist${playlists.length > 1 ? 's' : ''} importée${playlists.length > 1 ? 's' : ''}.`
    )
    return response.redirect().toRoute('playlists.index')
  }

  /**
   * Show individual record
   */
  async show({ params, auth, inertia, response, request }: HttpContext) {
    const playlist = await Playlist.findByOrFail('slug', params.slug)
    if (!playlist.isPublic && playlist.userId !== auth.user?.id) return response.notFound()
    const items = await PlaylistItem.query().where('playlistId', playlist.id).orderBy('position')
    const editorialMediaIds = items.flatMap(
      (item) => /^\/editorial\/media\/([a-f0-9-]{36})$/.exec(item.imageUrl)?.slice(1) || []
    )
    const editorialMedia = editorialMediaIds.length
      ? await db
          .from('editorial_media')
          .whereIn('id', editorialMediaIds)
          .select('id', 'path', 'provenance')
      : []
    const editorial = await db.from('editorial_proposals').where('playlist_id', playlist.id).first()
    const editorialItems = (editorial?.content.items || []) as {
      id: string
      image_credit?: string
    }[]
    const identities = editorial
      ? await db
          .from('playlist_items')
          .where('playlist_id', playlist.id)
          .select('id', 'editorial_item_id')
      : []
    const visitorId = request.cookie('pos_visitor') || string.random(32)
    response.cookie('pos_visitor', visitorId, { httpOnly: true, sameSite: 'lax', maxAge: '1 year' })
    return inertia.render('playlists/show', {
      playlist: {
        slug: playlist.slug,
        title: playlist.title,
        description: playlist.description || undefined,
        accent: playlist.accent as 'lime' | 'violet' | 'coral' | 'sky',
        isPublic: playlist.isPublic,
        updatedAt: playlist.updatedAt?.toISO() ?? undefined,
      },
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        imageUrl:
          editorialMedia.find(
            (media) => !media.path && item.imageUrl === `/editorial/media/${media.id}`
          )?.provenance.url || item.imageUrl,
        smashes: item.smashes,
        passes: item.passes,
        imageCredit: (() => {
          const entry = editorialItems.find(
            (candidate) =>
              candidate.id ===
              identities.find((identity) => identity.id === item.id)?.editorial_item_id
          )
          const provenance = editorialMedia.find(
            (media) => item.imageUrl === `/editorial/media/${media.id}`
          )?.provenance
          return entry?.image_credit !== undefined
            ? { url: item.imageUrl, credit: entry.image_credit }
            : provenance
        })(),
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
