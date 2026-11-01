import type { HttpContext } from '@adonisjs/core/http'
import { z } from 'zod'
import AdminManagement from '#services/admin/management'
import {
  AdminError,
  deletePlaylistSchema,
  entityId,
  filtersSchema,
  playlistEditSchema,
  playlistFiltersSchema,
  suspensionSchema,
} from '#services/admin/contracts'

export default class AdminController {
  private management = new AdminManagement()
  async index({ auth, inertia }: HttpContext) {
    return inertia.render('admin/index', await this.management.overview(auth.user!))
  }
  async users(ctx: HttpContext) {
    const filters = filtersSchema.safeParse(ctx.request.qs())
    if (!filters.success) return ctx.response.badRequest('Filtres invalides.')
    return ctx.inertia.render(
      'admin/users',
      await this.management.users(ctx.auth.user!, filters.data)
    )
  }
  async user(ctx: HttpContext) {
    const id = entityId.safeParse(ctx.params.id)
    if (!id.success) return ctx.response.notFound()
    try {
      return ctx.inertia.render('admin/user', await this.management.user(ctx.auth.user!, id.data))
    } catch (error) {
      if (error instanceof AdminError && error.code === 'NOT_FOUND') return ctx.response.notFound()
      throw error
    }
  }
  async playlists(ctx: HttpContext) {
    const filters = playlistFiltersSchema.safeParse(ctx.request.qs())
    if (!filters.success) return ctx.response.badRequest('Filtres invalides.')
    return ctx.inertia.render(
      'admin/playlists',
      await this.management.playlists(ctx.auth.user!, filters.data)
    )
  }
  async playlist(ctx: HttpContext) {
    const id = entityId.safeParse(ctx.params.id)
    if (!id.success) return ctx.response.notFound()
    try {
      return ctx.inertia.render(
        'admin/playlist',
        await this.management.playlist(ctx.auth.user!, id.data)
      )
    } catch (error) {
      if (error instanceof AdminError && error.code === 'NOT_FOUND') return ctx.response.notFound()
      throw error
    }
  }
  private async action(ctx: HttpContext, redirect: string, run: () => Promise<unknown>) {
    try {
      await run()
      ctx.session.flash('success', 'Action d’administration enregistrée.')
    } catch (error) {
      if (error instanceof AdminError) ctx.session.flash('error', error.message)
      else if (error instanceof z.ZodError)
        ctx.session.flash('error', 'Données invalides. Vérifiez les champs du formulaire.')
      else throw error
    }
    return ctx.response.redirect().withQs(false).toPath(redirect)
  }
  async suspend(ctx: HttpContext) {
    const id = entityId.safeParse(ctx.params.id)
    if (!id.success) return ctx.response.notFound()
    return this.action(ctx, `/admin/users/${id.data}`, () =>
      this.management.suspend(ctx.auth.user!, id.data, suspensionSchema.parse(ctx.request.body()))
    )
  }
  async updatePlaylist(ctx: HttpContext) {
    const id = entityId.safeParse(ctx.params.id)
    if (!id.success) return ctx.response.notFound()
    return this.action(ctx, `/admin/playlists/${id.data}`, () =>
      this.management.updatePlaylist(
        ctx.auth.user!,
        id.data,
        playlistEditSchema.parse(ctx.request.body())
      )
    )
  }
  async deletePlaylist(ctx: HttpContext) {
    const id = entityId.safeParse(ctx.params.id)
    if (!id.success) return ctx.response.notFound()
    const payload = deletePlaylistSchema.safeParse(ctx.request.body())
    if (!payload.success)
      return this.action(ctx, `/admin/playlists/${id.data}`, async () => {
        throw new AdminError('VALIDATION_FAILED', 'Confirmation de suppression invalide.')
      })
    try {
      await this.management.deletePlaylist(ctx.auth.user!, id.data, payload.data)
      ctx.session.flash('success', 'Playlist supprimée. Les médias partagés sont conservés.')
      return ctx.response.redirect().withQs(false).toPath('/admin/playlists')
    } catch (error) {
      if (!(error instanceof AdminError)) throw error
      ctx.session.flash('error', error.message)
      return ctx.response.redirect().withQs(false).toPath(`/admin/playlists/${id.data}`)
    }
  }
}
