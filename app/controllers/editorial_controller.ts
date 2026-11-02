import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import Proposals, { audit } from '#services/editorial/proposals'
import EditorialJobs from '#services/editorial/jobs'
import { getSettings, saveSettings, readiness, scheduleSlots } from '#services/editorial/settings'
import { dashboardActor, isEditorialAdmin } from '#services/editorial/access'
import {
  EditorialError,
  contentSchema,
  id,
  key,
  provenanceSchema,
  revision,
  scopes,
} from '#services/editorial/contracts'
export default class EditorialController {
  private proposals = new Proposals()
  async index({ auth, inertia }: HttpContext) {
    const settings = await getSettings()
    return inertia.render('editorial/index', {
      externalOAuth: !!env.get('MCP_OAUTH_ISSUER'),
      settings,
      missing: readiness(settings),
      nextSlot:
        scheduleSlots(settings)
          .find((slot) => slot.at.toMillis() > Date.now())
          ?.at.toISO() || null,
      proposals: await db
        .from('editorial_proposals')
        .where('user_id', auth.user!.id)
        .orderBy('created_at', 'desc')
        .limit(100)
        .select('id', 'status', 'revision', 'content', 'created_at'),
      jobs: await db
        .from('editorial_jobs')
        .where('user_id', auth.user!.id)
        .orderBy('created_at', 'desc')
        .limit(100)
        .select('id', 'kind', 'status', 'attempts', 'error', 'result', 'created_at'),
      connections: await db
        .from('editorial_connections')
        .where('user_id', auth.user!.id)
        .select('id', 'subject', 'client_id', 'scopes', 'expires_at', 'revoked'),
    })
  }
  async show({ params, auth, inertia }: HttpContext) {
    const proposal = await this.proposals.get(dashboardActor(auth.user!), id.parse(params.id))
    const validation = await this.proposals.validate(
      dashboardActor(auth.user!),
      proposal.id,
      proposal.revision
    )
    const mediaIds = proposal.content.items.flatMap((item: { media_id?: string }) =>
      item.media_id ? [item.media_id] : []
    )
    return inertia.render('editorial/show', {
      proposal,
      validation,
      jobs: await db
        .from('editorial_jobs')
        .where('user_id', auth.user!.id)
        .where('kind', 'image')
        .whereRaw("input->>'proposal_id' = ?", [proposal.id])
        .orderBy('created_at', 'desc')
        .limit(30)
        .select('id', 'status', 'stage', 'attempts', 'error', 'input', 'created_at'),
      media: mediaIds.length
        ? await db
            .from('editorial_media')
            .where('user_id', auth.user!.id)
            .whereIn('id', mediaIds)
            .select('id', 'provenance', 'width', 'height')
        : [],
    })
  }
  private async perform(ctx: HttpContext, run: () => Promise<unknown>) {
    try {
      const destination = await run()
      if (typeof destination === 'string') {
        ctx.session.flash('success', 'Action éditoriale enregistrée.')
        return ctx.response.redirect().toPath(destination)
      }
      ctx.session.flash('success', 'Action éditoriale enregistrée.')
    } catch (error) {
      if (
        error instanceof EditorialError ||
        error instanceof z.ZodError ||
        error instanceof SyntaxError
      )
        ctx.session.flash(
          'error',
          error instanceof EditorialError
            ? error.message
            : 'Données invalides. Vérifiez les champs.'
        )
      else throw error
    }
    return ctx.response.redirect().back()
  }
  async settings(ctx: HttpContext) {
    return this.perform(ctx, async () => {
      const settings = await saveSettings(JSON.parse(ctx.request.input('settings')))
      await db.transaction((trx) =>
        audit(trx, dashboardActor(ctx.auth.user!), 'settings', undefined, undefined, {
          enabled: settings.enabled,
        })
      )
    })
  }
  async connection(ctx: HttpContext) {
    if (!env.get('MCP_OAUTH_ISSUER'))
      return ctx.response.forbidden(
        'Les accès MCP sont accordés depuis la page de consentement Discord.'
      )
    return this.perform(ctx, async () => {
      const payload = z
        .strictObject({
          subject: z.string().min(1).max(255),
          client_id: z.string().min(1).max(255),
          scopes: z
            .array(z.enum(scopes))
            .min(1)
            .refine((values) => values.includes('editorial:read')),
          expires_at: z.iso
            .datetime({ offset: true })
            .refine((value) => Date.parse(value) > Date.now()),
        })
        .parse(JSON.parse(ctx.request.input('connection')))
      await db.transaction(async (trx) => {
        await trx.rawQuery('select pg_advisory_xact_lock(hashtextextended(?, 0))', [
          `editorial-connection:${payload.subject}:${payload.client_id}`,
        ])
        const previous = await trx
          .from('editorial_connections')
          .where({ subject: payload.subject, client_id: payload.client_id })
          .first()
        if (previous && previous.user_id !== ctx.auth.user!.id)
          throw new EditorialError('FORBIDDEN', 'Cette connexion appartient à un autre compte.')
        await trx
          .table('editorial_connections')
          .insert({
            ...payload,
            id: randomUUID(),
            scopes: JSON.stringify(payload.scopes),
            user_id: ctx.auth.user!.id,
          })
          .onConflict(['subject', 'client_id'])
          .merge({
            scopes: JSON.stringify(payload.scopes),
            expires_at: payload.expires_at,
            revoked: false,
          })
        await audit(trx, dashboardActor(ctx.auth.user!), 'grant_connection', undefined, undefined, {
          client_id: payload.client_id,
        })
      })
    })
  }
  async revoke(ctx: HttpContext) {
    return this.perform(ctx, () =>
      db.transaction(async (trx) => {
        await trx
          .from('editorial_connections')
          .where({ id: id.parse(ctx.params.id), user_id: ctx.auth.user!.id })
          .update({ revoked: true })
        await audit(
          trx,
          dashboardActor(ctx.auth.user!),
          'revoke_connection',
          undefined,
          undefined,
          { connection_id: ctx.params.id }
        )
      })
    )
  }
  async retry(ctx: HttpContext) {
    return this.perform(ctx, async () => {
      const updated = await db
        .from('editorial_jobs')
        .where({ id: id.parse(ctx.params.id), user_id: ctx.auth.user!.id, status: 'failed' })
        .update({
          status: 'queued',
          stage: 'queued',
          error: null,
          attempts: 0,
          lease_token: null,
          lease_until: null,
          available_at: new Date(),
          updated_at: new Date(),
        })
      if (!updated)
        throw new EditorialError(
          'NOT_FOUND',
          'Cette tâche est introuvable ou ne peut pas être relancée.'
        )
    })
  }
  async generate(ctx: HttpContext) {
    return this.perform(ctx, async () => {
      const input = z
        .strictObject({
          topic: z.string().min(1).max(200),
          category: z.string().min(1).max(60),
          item_count: z.number().int().min(2).max(30),
          idempotency_key: key,
        })
        .parse(ctx.request.body())
      return new EditorialJobs().enqueue(
        dashboardActor(ctx.auth.user!),
        'generation',
        { topic: input.topic, category: input.category, item_count: input.item_count },
        input.idempotency_key
      )
    })
  }
  async create(ctx: HttpContext) {
    return this.perform(ctx, async () => {
      const result = await this.proposals.create(
        dashboardActor(ctx.auth.user!),
        contentSchema.parse(JSON.parse(ctx.request.input('content'))),
        key.parse(ctx.request.input('idempotency_key'))
      )
      // Open the created draft immediately instead of leaving it hidden in the list.
      return `/admin/editorial/proposals/${result.proposal_id}`
    })
  }
  async action(ctx: HttpContext) {
    return this.perform(ctx, async () => {
      const actor = dashboardActor(ctx.auth.user!)
      const proposalId = id.parse(ctx.params.id)
      const expected = revision.parse(ctx.request.input('expected_revision'))
      switch (ctx.params.action) {
        case 'save':
          return this.proposals.mutate(actor, proposalId, expected, 'update', () =>
            contentSchema.parse(JSON.parse(ctx.request.input('content')))
          )
        case 'submit':
          return this.proposals.submit(
            actor,
            proposalId,
            expected,
            key.parse(ctx.request.input('idempotency_key'))
          )
        case 'publish':
          return this.proposals.publish(actor, proposalId, expected)
        case 'reject':
          return this.proposals.transition(actor, proposalId, expected, 'reject')
        case 'reopen':
          return this.proposals.transition(actor, proposalId, expected, 'reopen')
        case 'import': {
          const input = {
            proposal_id: proposalId,
            expected_revision: expected,
            item_id: id.parse(ctx.request.input('item_id')),
            provenance: provenanceSchema.parse(JSON.parse(ctx.request.input('provenance'))),
          }
          return new EditorialJobs().enqueue(
            actor,
            'image',
            input,
            key.parse(ctx.request.input('idempotency_key'))
          )
        }
        default:
          throw new EditorialError('VALIDATION_FAILED', 'Action inconnue.')
      }
    })
  }
  async media({ params, auth, response }: HttpContext) {
    if (!id.safeParse(params.id).success) return response.notFound()
    const media = await db.from('editorial_media').where('id', params.id).first()
    if (!media) return response.notFound()
    const publicUse = await db
      .from('editorial_proposals as proposal')
      .join('playlists as playlist', 'playlist.id', 'proposal.playlist_id')
      .where('proposal.status', 'published')
      .where('playlist.is_public', true)
      .whereRaw("proposal.content->'items' @> ?::jsonb", [JSON.stringify([{ media_id: media.id }])])
      .first()
    if (!publicUse) {
      if (!isEditorialAdmin(auth.user)) return response.notFound()
      if (auth.user!.id !== media.user_id) {
        const playlistUse = await db
          .from('playlist_items')
          .where('image_url', `/editorial/media/${media.id}`)
          .first()
        const approvedUse = await db
          .from('editorial_proposals')
          .where('status', 'published')
          .whereRaw("content->'items' @> ?::jsonb", [JSON.stringify([{ media_id: media.id }])])
          .first()
        if (!playlistUse || !approvedUse) return response.notFound()
      }
    }
    response.header('Cache-Control', 'private, no-store').header('Content-Type', 'image/png')
    return response.download(app.tmpPath('editorial', media.path))
  }
}
