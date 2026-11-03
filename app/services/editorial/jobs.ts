import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import env from '#start/env'
import {
  type Actor,
  EditorialError,
  assertDraft,
  assertRevision,
  requireScope,
  scopes,
} from './contracts.js'
import Proposals, { audit, idempotent } from './proposals.js'
import { getSettings, scheduleSlots } from './settings.js'
import NewsTopics from '#services/news/topics'
import GenerationProvider from '#services/generation/provider'
import EditorialMedia from './media.js'
import { safeDownload } from './network.js'
import { isEditorialAdmin } from './access.js'
import User from '#models/user'
export default class EditorialJobs {
  constructor(
    private providers = {
      news: new NewsTopics(),
      generation: new GenerationProvider(),
      media: new EditorialMedia() as Pick<EditorialMedia, 'import'>,
    }
  ) {}
  async retry(actor: Actor, jobId: string) {
    requireScope(actor, 'editorial:write')
    const updated = await db
      .from('editorial_jobs')
      .where({ id: jobId, user_id: actor.userId, status: 'failed' })
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
    if (!updated) throw new EditorialError('NOT_FOUND', 'Cette tâche ne peut pas être relancée.')
    return { job_id: jobId, status: 'queued' }
  }
  async enqueue(
    actor: Actor,
    kind: 'generation' | 'image',
    input: Record<string, unknown>,
    key: string
  ) {
    requireScope(actor, kind === 'generation' ? 'editorial:generate' : 'editorial:write')
    return idempotent(actor, `enqueue_${kind}`, key, input, async (trx) => {
      let jobInput = input
      if (kind === 'image') {
        const proposal = await new Proposals().get(actor, String(input.proposal_id), trx, true)
        assertRevision(proposal.revision, Number(input.expected_revision))
        assertDraft(proposal.status)
        const item = proposal.content.items.find(
          (entry: { id: string }) => entry.id === input.item_id
        )
        if (!item) throw new EditorialError('NOT_FOUND', 'Élément introuvable.')
        jobInput = { ...input, expected_media_id: item.media_id || null }
      }
      const jobId = randomUUID()
      await trx.table('editorial_jobs').insert({
        id: jobId,
        user_id: actor.userId,
        kind,
        input: JSON.stringify(jobInput),
        available_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      await audit(trx, actor, `enqueue_${kind}`, undefined, undefined, { job_id: jobId })
      return { job_id: jobId, status: 'queued' }
    })
  }
  async schedule(now: DateTime = DateTime.utc()) {
    const settings = await getSettings()
    if (!settings.enabled || !settings.automation_user_id) return
    const user = await User.find(settings.automation_user_id)
    if (!user || !isEditorialAdmin(user))
      throw new EditorialError(
        'FORBIDDEN',
        'Le compte de préparation doit être un administrateur autorisé.'
      )
    const due = scheduleSlots(settings, now)
      .filter(
        (slot) => slot.at <= now && now.diff(slot.at, 'hours').hours <= settings.catchup_hours
      )
      .at(-1)
    if (!due) return
    await db
      .table('editorial_jobs')
      .insert({
        id: randomUUID(),
        user_id: user.id,
        kind: 'generation',
        slot_key: due.key,
        input: JSON.stringify({ automatic: true, item_count: settings.item_count }),
        available_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflict('slot_key')
      .ignore()
  }
  async workOne() {
    const job = await db.transaction(async (trx) => {
      const candidate = await trx
        .from('editorial_jobs')
        .where((query) => {
          query
            .where((q) => q.where('status', 'queued').where('available_at', '<=', new Date()))
            .orWhere((q) => q.where('status', 'running').where('lease_until', '<', new Date()))
        })
        .orderBy('created_at')
        .forUpdate()
        .skipLocked()
        .first()
      if (!candidate) return null
      const lease = randomUUID()
      await trx
        .from('editorial_jobs')
        .where('id', candidate.id)
        .update({
          status: 'running',
          attempts: candidate.attempts + 1,
          lease_token: lease,
          lease_until: new Date(Date.now() + 15 * 60000),
          updated_at: new Date(),
        })
      return { ...candidate, lease_token: lease, attempts: candidate.attempts + 1 }
    })
    if (!job) return false
    const actor: Actor = {
      userId: job.user_id,
      identity: `worker:${job.user_id}`,
      scopes: [...scopes],
    }
    const proposals = new Proposals()
    const deadline = Date.now() + 120000
    const checkDeadline = () => {
      if (Date.now() > deadline)
        throw new EditorialError('PROVIDER_UNAVAILABLE', 'Durée maximale du traitement atteinte.')
    }
    try {
      const user = await User.find(actor.userId)
      if (!user || !isEditorialAdmin(user))
        throw new EditorialError('FORBIDDEN', 'Compte éditorial révoqué.')
      if (job.attempts > 3)
        throw new EditorialError('PROVIDER_UNAVAILABLE', 'Nombre maximal de tentatives atteint.')
      let result: Record<string, unknown>
      if (job.kind === 'notification') {
        const endpoint = env.get('EDITORIAL_NOTIFICATION_URL')
        if (!endpoint)
          throw new EditorialError('PROVIDER_UNAVAILABLE', 'Notification non configurée.', true)
        await safeDownload(endpoint, {
          method: 'POST',
          limit: 65536,
          headers: {
            'content-type': 'application/json',
            'idempotency-key': job.id,
            ...(env.get('EDITORIAL_NOTIFICATION_TOKEN')
              ? { authorization: `Bearer ${env.get('EDITORIAL_NOTIFICATION_TOKEN')}` }
              : {}),
          },
          body: JSON.stringify({
            event: job.input.event,
            url: `${env.get('APP_URL')}/admin/editorial${job.input.proposal_id ? `/proposals/${job.input.proposal_id}` : ''}`,
            job_id: job.input.job_id,
          }),
        })
        result = { delivered: true }
      } else if (job.kind === 'image') {
        const previous = await db
          .from('editorial_operations')
          .where({ actor: actor.identity, operation: 'apply_image', key: job.id })
          .first()
        if (previous) {
          await this.finish(job, 'succeeded', previous.result)
          return true
        }
        const proposal = await proposals.get(actor, job.input.proposal_id)
        if (!('expected_media_id' in job.input))
          assertRevision(proposal.revision, job.input.expected_revision)
        assertDraft(proposal.status)
        const media =
          job.result?.media || (await this.providers.media.import(actor, job.input.provenance))
        await this.checkpoint(job, 'image_verified', { media })
        checkDeadline()
        result = await idempotent(actor, 'apply_image', job.id, job.input, async (trx) => {
          const current = await proposals.get(actor, job.input.proposal_id, trx, true)
          return proposals.mutate(
            actor,
            job.input.proposal_id,
            current.revision,
            'import_image',
            (content) => {
              const item = content.items.find((entry) => entry.id === job.input.item_id)
              if (!item) throw new EditorialError('NOT_FOUND', 'Élément introuvable.')
              if (
                'expected_media_id' in job.input &&
                (item.media_id || null) !== job.input.expected_media_id
              )
                throw new EditorialError(
                  'REVISION_CONFLICT',
                  'L’image de cet élément a changé. Relancez un nouvel import.'
                )
              if (!('expected_media_id' in job.input))
                assertRevision(current.revision, job.input.expected_revision)
              item.media_id = media.media_id
              delete item.image_url
              return content
            },
            trx
          )
        })
      } else {
        const existing = await db
          .from('editorial_proposals')
          .where({ job_id: job.id, user_id: actor.userId })
          .first()
        if (existing) {
          await this.finish(job, 'succeeded', {
            proposal_id: existing.id,
            revision: existing.revision,
            status: existing.status,
          })
          return true
        }
        const settings = await getSettings()
        let generated = job.result?.generated as
          Awaited<ReturnType<GenerationProvider['generate']>> | undefined
        if (!generated) {
          await this.checkpoint(job, 'collecting', {})
          const candidates = await this.providers.news.find(
            actor,
            job.input.category ? [job.input.category] : undefined,
            undefined,
            50
          )
          const topic = job.input.candidate_id
            ? candidates.find((candidate) => candidate.id === job.input.candidate_id)
            : job.input.topic
              ? candidates.find((candidate) =>
                  candidate.title.toLowerCase().includes(String(job.input.topic).toLowerCase())
                )
              : candidates[0]
          checkDeadline()
          if (!topic) {
            await this.notify(job, 'no_topic')
            await this.finish(job, 'no_topic', {
              message: 'Aucun sujet récent et vérifiable retenu.',
            })
            return true
          }
          // Reserve the maximum configured price before each external generation call.
          await db.transaction(async (trx) => {
            await trx.rawQuery('select pg_advisory_xact_lock(hashtextextended(?, 0))', [
              'editorial:daily-budget',
            ])
            const charges = await trx
              .from('editorial_audit')
              .where('action', 'generation_charge')
              .where('created_at', '>=', DateTime.utc().startOf('day').toJSDate())
            const spent = charges.reduce((sum, charge) => sum + Number(charge.details.cents), 0)
            if (
              charges.length >= settings.daily_job_limit ||
              spent + settings.generation_call_cost_cents > settings.daily_budget_cents
            )
              throw new EditorialError(
                'BUDGET_EXCEEDED',
                'Plafond journalier de coût ou d’appels atteint.'
              )
            await audit(trx, actor, 'generation_charge', undefined, undefined, {
              job_id: job.id,
              cents: settings.generation_call_cost_cents,
            })
          })
          generated = await this.providers.generation.generate(
            topic,
            job.input.item_count || settings.item_count,
            job.id
          )
          await this.checkpoint(job, 'generated', { generated })
        }
        for (const image of generated.images) {
          const item = generated.content.items[image.item_index]
          if (!item.media_id && !item.image_url) {
            item.image_url = image.provenance.url
            item.image_credit = image.provenance.credit
          }
        }
        checkDeadline()
        result = await proposals.create(
          actor,
          generated.content,
          `generation:${job.id}`,
          job.id,
          job.lease_token
        )
        if (job.input.automatic) await this.notify(job, 'ready', String(result.proposal_id))
      }
      await this.finish(job, 'succeeded', result)
    } catch (error) {
      const failure =
        error instanceof EditorialError
          ? error
          : new EditorialError(
              'PROVIDER_UNAVAILABLE',
              'Traitement fournisseur impossible. Vérifier sa configuration et ses réponses.',
              true
            )
      const retry = failure.retryable && job.attempts < 3
      await db
        .from('editorial_jobs')
        .where({ id: job.id, lease_token: job.lease_token })
        .update({
          status: retry ? 'queued' : 'failed',
          error: JSON.stringify(failure.toJSON()),
          available_at: new Date(Date.now() + 60000 * 2 ** job.attempts),
          lease_until: null,
          updated_at: new Date(),
        })
      if (!retry && job.kind !== 'notification') await this.notify(job, 'failed')
    }
    return true
  }
  private async checkpoint(
    job: { id: string; lease_token: string },
    stage: string,
    result: unknown
  ) {
    const updated = await db
      .from('editorial_jobs')
      .where({ id: job.id, lease_token: job.lease_token })
      .update({ stage, result: JSON.stringify(result), updated_at: new Date() })
    if (!updated) throw new EditorialError('INVALID_STATE', 'Verrou de tâche expiré.')
  }
  private async finish(job: { id: string; lease_token: string }, status: string, result: unknown) {
    await db
      .from('editorial_jobs')
      .where({ id: job.id, lease_token: job.lease_token })
      .update({
        status,
        stage: status,
        result: JSON.stringify(result),
        error: null,
        lease_until: null,
        updated_at: new Date(),
      })
  }
  private async notify(job: { id: string; user_id: number }, event: string, proposalId?: string) {
    if (!env.get('EDITORIAL_NOTIFICATION_URL')) return
    await db
      .table('editorial_jobs')
      .insert({
        id: randomUUID(),
        user_id: job.user_id,
        kind: 'notification',
        slot_key: `notification:${job.id}:${event}`,
        input: JSON.stringify({ event, job_id: job.id, proposal_id: proposalId }),
        available_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflict('slot_key')
      .ignore()
  }
}
