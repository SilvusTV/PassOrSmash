import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { createHash, randomUUID } from 'node:crypto'
import Playlist from '#models/playlist'
import PlaylistItem from '#models/playlist_item'
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
    return { ...proposal, preview_url: `/admin/editorial/proposals/${proposal.id}` }
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
      assertDraft(proposal.status)
      const content = contentSchema.parse(edit(proposal.content))
      await this.checkMediaOwnership(actor, content, trx)
      const revision = proposal.revision + 1
      await trx
        .from('editorial_proposals')
        .where('id', proposalId)
        .update({ content: JSON.stringify(content), revision, updated_at: new Date() })
      await this.snapshot(trx, proposalId, revision, content)
      await audit(trx, actor, action, proposalId, revision)
      return { proposal_id: proposalId, revision, status: 'draft' }
    }
    return transaction ? run(transaction) : db.transaction(run)
  }

  async validate(actor: Actor, proposalId: string, expected: number, trx?: Trx) {
    const proposal = await this.get(actor, proposalId, trx)
    assertRevision(proposal.revision, expected)
    const content = contentSchema.parse(proposal.content)
    const blockers = [...content.checks]
    if (content.items.length < 2) blockers.push('Au moins deux éléments sont nécessaires.')
    if (!content.sources.length) blockers.push('Au moins une source est nécessaire.')
    const itemIds = content.items.map((item) => item.id)
    if (itemIds.some((itemId) => !itemId) || new Set(itemIds).size !== itemIds.length)
      blockers.push('Identifiants des éléments invalides.')
    const sources = new Set(content.sources.map((source) => source.url))
    for (const item of content.items) {
      if (!item.media_id) blockers.push(`${item.title} : image vérifiée manquante.`)
      if (!item.source_urls.length || item.source_urls.some((url) => !sources.has(url)))
        blockers.push(`${item.title} : sources manquantes ou non référencées.`)
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
      warnings: [
        'Vérifier les faits, la pertinence éditoriale et les droits des images avant publication.',
      ],
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

  // This method is deliberately never registered as an MCP tool.
  async publish(actor: Actor, proposalId: string, expected: number) {
    if (actor.identity !== `dashboard:${actor.userId}`)
      throw new EditorialError('FORBIDDEN', 'Validation humaine requise.')
    return db.transaction(async (trx) => {
      const proposal = await this.get(actor, proposalId, trx, true)
      assertRevision(proposal.revision, expected)
      if (proposal.status === 'published') return { playlist_id: proposal.playlist_id }
      if (proposal.status !== 'in_review')
        throw new EditorialError('INVALID_STATE', 'La proposition doit être soumise pour examen.')
      const validation = await this.validate(actor, proposalId, expected, trx)
      if (!validation.valid)
        throw new EditorialError('VALIDATION_FAILED', validation.blockers.join('\n'))
      const content: Content = proposal.content
      const playlist = await Playlist.create(
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
      await PlaylistItem.createMany(
        content.items.map((item, position) => ({
          playlistId: playlist.id,
          title: item.title,
          description: item.description || null,
          position,
          imageUrl: `/editorial/media/${item.media_id}`,
        })),
        { client: trx }
      )
      await trx.from('editorial_proposals').where('id', proposalId).update({
        status: 'published',
        playlist_id: playlist.id,
        approved_by: actor.userId,
        approved_revision: expected,
        approved_at: new Date(),
        updated_at: new Date(),
      })
      await audit(trx, actor, 'publish', proposalId, expected, { playlist_id: playlist.id })
      return { playlist_id: playlist.id }
    })
  }

  async transition(
    actor: Actor,
    proposalId: string,
    expected: number,
    action: 'reject' | 'reopen'
  ) {
    if (actor.identity !== `dashboard:${actor.userId}`)
      throw new EditorialError('FORBIDDEN', 'Action réservée au tableau de bord.')
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
