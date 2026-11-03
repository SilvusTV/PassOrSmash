import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { createHash, randomUUID } from 'node:crypto'
import Playlist from '#models/playlist'
import EditorialMedia from './media.js'
import app from '@adonisjs/core/services/app'
import { stat } from 'node:fs/promises'
import {
  type Actor,
  type Content,
  EditorialError,
  assertDraft,
  assertRevision,
  contentSchema,
  requireScope,
} from './contracts.js'

type Trx = TransactionClientContract
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
export async function audit(
  trx: Trx,
  actor: Actor,
  action: string,
  proposalId?: string,
  revision?: number,
  details = {}
) {
  await trx.table('editorial_audit').insert({
    actor: actor.identity,
    action,
    proposal_id: proposalId,
    revision,
    details: JSON.stringify(details),
    created_at: new Date(),
  })
}
export async function idempotent<T>(
  actor: Actor,
  operation: string,
  key: string,
  input: unknown,
  run: (trx: Trx) => Promise<T>
): Promise<T> {
  return db.transaction(async (trx) => {
    const lock = `${actor.identity}:${operation}:${key}`
    await trx.rawQuery('select pg_advisory_xact_lock(hashtextextended(?, 0))', [lock])
    const hash = createHash('sha256').update(canonical(input)).digest('hex')
    const previous = await trx
      .from('editorial_operations')
      .where({ actor: actor.identity, operation, key })
      .first()
    if (previous) {
      if (previous.input_hash !== hash)
        throw new EditorialError(
          'VALIDATION_FAILED',
          'Cette clé a déjà été utilisée avec un autre contenu.'
        )
      return previous.result as T
    }
    const result = await run(trx)
    await trx.table('editorial_operations').insert({
      actor: actor.identity,
      operation,
      key,
      input_hash: hash,
      result: JSON.stringify(result),
    })
    return result
  })
}

export default class Proposals {
  async get(actor: Actor, proposalId: string, trx?: Trx, lock = false) {
    requireScope(actor, 'editorial:read')
    const query = (trx || db)
      .from('editorial_proposals')
      .where({ id: proposalId, user_id: actor.userId })
    if (lock) query.forUpdate()
    const proposal = await query.first()
    if (!proposal) throw new EditorialError('NOT_FOUND', 'Proposition introuvable.')
    const playlist = proposal.playlist_id
      ? await (trx || db)
          .from('playlists')
          .where({ id: proposal.playlist_id, user_id: actor.userId })
          .first()
      : null
    return {
      ...proposal,
      public_url: playlist ? `/p/${playlist.slug}` : null,
      preview_url: `/admin/editorial/proposals/${proposal.id}`,
    }
  }

  async create(actor: Actor, input: Content, key: string, jobId?: string, leaseToken?: string) {
    requireScope(actor, 'editorial:write')
    const content = contentSchema.parse(input)
    content.items = content.items.map((item) => ({ ...item, id: randomUUID() }))
    // Generated IDs are excluded from the idempotency fingerprint.
    return idempotent(actor, 'create_proposal', key, input, async (trx) => {
      if (jobId) {
        const job = await trx
          .from('editorial_jobs')
          .where({ id: jobId, user_id: actor.userId, lease_token: leaseToken })
          .forUpdate()
          .first()
        if (!job || !leaseToken || new Date(job.lease_until).getTime() <= Date.now())
          throw new EditorialError('INVALID_STATE', 'Verrou de génération expiré.')
      }
      await this.checkMediaOwnership(actor, content, trx)
      const proposalId = randomUUID()
      await trx.table('editorial_proposals').insert({
        id: proposalId,
        user_id: actor.userId,
        status: 'draft',
        revision: 1,
        content: JSON.stringify(content),
        job_id: jobId,
        created_at: new Date(),
        updated_at: new Date(),
      })
      await this.snapshot(trx, proposalId, 1, content)
      await audit(trx, actor, 'create', proposalId, 1)
      return { proposal_id: proposalId, revision: 1, status: 'draft' }
    })
  }

  async mutate(
    actor: Actor,
    proposalId: string,
    expected: number,
    action: string,
    edit: (content: Content) => Content,
    transaction?: Trx
  ) {
    requireScope(actor, 'editorial:write')
    const run = async (trx: Trx) => {
      const proposal = await this.get(actor, proposalId, trx, true)
      assertRevision(proposal.revision, expected)
      const content = contentSchema.parse(edit(proposal.content))
      content.items = content.items.map((item) => ({ ...item, id: item.id || randomUUID() }))
      await this.checkMediaOwnership(actor, content, trx)
      const revision = proposal.revision + 1
      await trx
        .from('editorial_proposals')
        .where('id', proposalId)
        .update({
          content: JSON.stringify(content),
          status: 'draft',
          revision,
          updated_at: new Date(),
        })
      await this.snapshot(trx, proposalId, revision, content)
      await audit(trx, actor, action, proposalId, revision)
      return proposal.status === 'published'
        ? this.publish(actor, proposalId, revision, trx)
        : { proposal_id: proposalId, revision, status: 'draft' }
    }
    return transaction ? run(transaction) : db.transaction(run)
  }

  async validate(actor: Actor, proposalId: string, expected: number, trx?: Trx) {
    const proposal = await this.get(actor, proposalId, trx)
    assertRevision(proposal.revision, expected)
    const content = contentSchema.parse(proposal.content)
    const blockers: string[] = []
    if (content.items.length < 2) blockers.push('Au moins deux éléments sont nécessaires.')
    const itemIds = content.items.map((item) => item.id)
    if (itemIds.some((itemId) => !itemId) || new Set(itemIds).size !== itemIds.length)
      blockers.push('Identifiants des éléments invalides.')
    for (const item of content.items) {
      if (!item.media_id && !item.image_url) blockers.push(`${item.title} : ajoutez une image.`)
    }
    await this.checkMediaOwnership(actor, content, trx)
    for (const mediaId of new Set(
      content.items.flatMap((item) => (item.media_id ? [item.media_id] : []))
    )) {
      const media = await (trx || db).from('editorial_media').where('id', mediaId).first()
      if (media && !media.path) continue
      try {
        const file = await stat(app.tmpPath('editorial', `${mediaId}.png`))
        if (!file.isFile() || file.size === 0) blockers.push('Fichier image indisponible.')
      } catch {
        blockers.push('Fichier image indisponible.')
      }
    }
    return {
      valid: blockers.length === 0,
      blockers,
      warnings: [],
      revision: expected,
    }
  }

  async submit(actor: Actor, proposalId: string, expected: number, key: string) {
    requireScope(actor, 'editorial:write')
    return idempotent(
      actor,
      'submit_proposal_for_review',
      key,
      { proposalId, expected },
      async (trx) => {
        const proposal = await this.get(actor, proposalId, trx, true)
        assertRevision(proposal.revision, expected)
        assertDraft(proposal.status)
        const validation = await this.validate(actor, proposalId, expected, trx)
        if (!validation.valid)
          throw new EditorialError('VALIDATION_FAILED', validation.blockers.join('\n'))
        await trx
          .from('editorial_proposals')
          .where('id', proposalId)
          .update({ status: 'in_review', updated_at: new Date() })
        await audit(trx, actor, 'submit', proposalId, expected)
        await trx.table('editorial_jobs').insert({
          id: randomUUID(),
          user_id: actor.userId,
          kind: 'notification',
          status: 'queued',
          input: JSON.stringify({ proposal_id: proposalId, event: 'ready' }),
          available_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        })
        return { proposal_id: proposalId, revision: expected, status: 'in_review' }
      }
    )
  }

  async publish(actor: Actor, proposalId: string, expected: number, transaction?: Trx) {
    requireScope(actor, 'editorial:write')
    const run = async (trx: Trx) => {
      const proposal = await this.get(actor, proposalId, trx, true)
      assertRevision(proposal.revision, expected)
      if (proposal.status === 'published')
        return {
          proposal_id: proposalId,
          revision: expected,
          status: 'published',
          playlist_id: proposal.playlist_id,
          public_url: proposal.public_url,
        }
      const validation = await this.validate(actor, proposalId, expected, trx)
      if (!validation.valid)
        throw new EditorialError('VALIDATION_FAILED', validation.blockers.join(' '))
      const content: Content = proposal.content
      let playlist = proposal.playlist_id
        ? await Playlist.query({ client: trx })
            .where({ id: proposal.playlist_id, user_id: actor.userId })
            .forUpdate()
            .first()
        : null
      if (!playlist) {
        playlist = await Playlist.create(
          {
            userId: actor.userId,
            title: content.title,
            description: content.description || null,
            slug: `selection-${randomUUID()}`,
            isPublic: true,
            accent: 'lime',
          },
          { client: trx }
        )
      } else {
        playlist.merge({
          title: content.title,
          description: content.description || null,
          isPublic: true,
        })
        await playlist.save()
      }
      const kept: number[] = []
      for (const [position, item] of content.items.entries()) {
        const values = {
          title: item.title,
          description: item.description || null,
          position,
          image_url: item.image_url || `/editorial/media/${item.media_id}`,
          updated_at: new Date(),
        }
        const existing = await trx
          .from('playlist_items')
          .where({ playlist_id: playlist.id, editorial_item_id: item.id! })
          .first()
        if (existing) {
          await trx.from('playlist_items').where('id', existing.id).update(values)
          kept.push(existing.id)
        } else {
          const [created] = await trx
            .table('playlist_items')
            .insert({
              ...values,
              playlist_id: playlist.id,
              editorial_item_id: item.id!,
              created_at: new Date(),
            })
            .returning('id')
          kept.push(created.id)
        }
      }
      await trx
        .from('playlist_items')
        .where('playlist_id', playlist.id)
        .whereNotIn('id', kept)
        .delete()
      await trx.from('editorial_proposals').where('id', proposalId).update({
        status: 'published',
        playlist_id: playlist.id,
        approved_by: actor.userId,
        approved_revision: expected,
        approved_at: new Date(),
        updated_at: new Date(),
      })
      await audit(trx, actor, 'publish', proposalId, expected, { playlist_id: playlist.id })
      return {
        proposal_id: proposalId,
        revision: expected,
        status: 'published',
        playlist_id: playlist.id,
        public_url: `/p/${playlist.slug}`,
      }
    }
    return transaction ? run(transaction) : db.transaction(run)
  }

  async setImage(
    actor: Actor,
    proposalId: string,
    expected: number,
    itemId: string,
    input: { url?: string; data_base64?: string; credit?: string },
    transaction?: Trx
  ) {
    requireScope(actor, 'editorial:write')
    const run = async (trx: Trx) => {
      const proposal = await this.get(actor, proposalId, trx, true)
      assertRevision(proposal.revision, expected)
      if (!proposal.content.items.some((item: Content['items'][number]) => item.id === itemId))
        throw new EditorialError('NOT_FOUND', 'Élément introuvable.')
      let mediaId: string | undefined
      if (input.data_base64) {
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.data_base64))
          throw new EditorialError('VALIDATION_FAILED', 'Fichier image encodé invalide.')
        const bytes = Buffer.from(input.data_base64, 'base64')
        if (bytes.length > 8 * 1024 * 1024)
          throw new EditorialError('VALIDATION_FAILED', 'Image trop volumineuse (8 Mo maximum).')
        const uploaded = await new EditorialMedia().upload(
          actor,
          bytes,
          { credit: input.credit || '' },
          trx
        )
        mediaId = uploaded.media_id
      }
      return this.mutate(
        actor,
        proposalId,
        expected,
        'set_image',
        (content) => ({
          ...content,
          items: content.items.map((item) => {
            if (item.id !== itemId) return item
            const rest = { ...item }
            delete rest.media_id
            delete rest.image_url
            return {
              ...rest,
              ...(mediaId ? { media_id: mediaId } : input.url ? { image_url: input.url } : {}),
              image_credit: input.credit ?? item.image_credit ?? '',
            }
          }),
        }),
        trx
      )
    }
    return transaction ? run(transaction) : db.transaction(run)
  }

  async unpublish(actor: Actor, proposalId: string, expected: number) {
    requireScope(actor, 'editorial:write')
    return db.transaction(async (trx) => {
      const proposal = await this.get(actor, proposalId, trx, true)
      assertRevision(proposal.revision, expected)
      if (proposal.playlist_id)
        await trx
          .from('playlists')
          .where({ id: proposal.playlist_id, user_id: actor.userId })
          .update({ is_public: false, updated_at: new Date() })
      const revision = expected + 1
      await trx
        .from('editorial_proposals')
        .where('id', proposalId)
        .update({ status: 'draft', revision, updated_at: new Date() })
      await this.snapshot(trx, proposalId, revision, proposal.content)
      await audit(trx, actor, 'unpublish', proposalId, revision)
      return { proposal_id: proposalId, revision, status: 'draft' }
    })
  }

  async remove(actor: Actor, proposalId: string, expected: number) {
    requireScope(actor, 'editorial:write')
    return db.transaction(async (trx) => {
      const proposal = await this.get(actor, proposalId, trx, true)
      assertRevision(proposal.revision, expected)
      const jobs = await trx
        .from('editorial_jobs')
        .where('user_id', actor.userId)
        .where((query) => {
          query
            .whereRaw("input->>'proposal_id' = ?", [proposalId])
            .orWhereRaw("result->>'proposal_id' = ?", [proposalId])
          if (proposal.job_id) query.orWhere('id', proposal.job_id)
        })
        .select('id')
      const jobIds = jobs.map((job) => job.id)
      if (jobIds.length) {
        await trx
          .from('editorial_jobs')
          .whereIn('id', jobIds)
          .update({ result: trx.raw("result - 'proposal_id'") })
        await trx
          .from('editorial_jobs')
          .whereIn('id', jobIds)
          .whereIn('status', ['queued', 'running'])
          .update({
            status: 'cancelled',
            stage: 'cancelled',
            lease_token: null,
            lease_until: null,
            updated_at: new Date(),
          })
      }
      await audit(trx, actor, 'delete', proposalId, expected, { proposal_id: proposalId })
      await trx
        .from('editorial_audit')
        .where('proposal_id', proposalId)
        .update({ proposal_id: null })
      await trx.from('editorial_revisions').where('proposal_id', proposalId).delete()
      await trx.from('editorial_proposals').where('id', proposalId).delete()
      if (proposal.playlist_id)
        await trx
          .from('playlists')
          .where({ id: proposal.playlist_id, user_id: actor.userId })
          .delete()
      return { proposal_id: proposalId, deleted: true }
    })
  }

  async transition(
    actor: Actor,
    proposalId: string,
    expected: number,
    action: 'reject' | 'reopen'
  ) {
    requireScope(actor, 'editorial:write')
    return db.transaction(async (trx) => {
      const proposal = await this.get(actor, proposalId, trx, true)
      assertRevision(proposal.revision, expected)
      if (action === 'reject' && proposal.status !== 'in_review')
        throw new EditorialError('INVALID_STATE', 'Proposition hors revue.')
      if (action === 'reopen' && !['in_review', 'rejected'].includes(proposal.status))
        throw new EditorialError('INVALID_STATE', 'Réouverture impossible.')
      const revision = expected + 1
      await trx
        .from('editorial_proposals')
        .where('id', proposalId)
        .update({
          status: action === 'reject' ? 'rejected' : 'draft',
          revision,
          updated_at: new Date(),
        })
      await this.snapshot(trx, proposalId, revision, proposal.content)
      await audit(trx, actor, action, proposalId, revision)
      return { revision }
    })
  }

  private async snapshot(trx: Trx, proposalId: string, revision: number, content: Content) {
    await trx
      .table('editorial_revisions')
      .insert({ proposal_id: proposalId, revision, content: JSON.stringify(content) })
  }
  private async checkMediaOwnership(actor: Actor, content: Content, trx?: Trx) {
    for (const mediaId of new Set(
      content.items.flatMap((item) => (item.media_id ? [item.media_id] : []))
    )) {
      if (
        !(await (trx || db)
          .from('editorial_media')
          .where({ id: mediaId, user_id: actor.userId })
          .first())
      )
        throw new EditorialError('VALIDATION_FAILED', 'Image introuvable ou inaccessible.')
    }
  }
}
