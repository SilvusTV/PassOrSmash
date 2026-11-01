import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import User from '#models/user'
import { createHash, randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { isEditorialAdmin } from '#services/editorial/access'
import { AdminError, playlistEditSchema, type PlaylistEdit } from './contracts.js'

type Trx = TransactionClientContract
type Filter = { q: string; page: number }
const searchTerm = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`
const pageSize = 25
export function playlistRevision(
  playlist: Record<string, unknown>,
  items: Record<string, unknown>[]
) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        title: playlist.title,
        description: playlist.description,
        visibility: playlist.is_public,
        accent: playlist.accent,
        updatedAt: playlist.updated_at,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          image_url: item.image_url,
          position: item.position,
        })),
      })
    )
    .digest('hex')
}
async function assertAdmin(actor: User) {
  const current = await User.find(actor.id)
  if (!isEditorialAdmin(current || undefined))
    throw new AdminError('FORBIDDEN', 'Accès administrateur requis.')
}
async function audit(
  trx: Trx,
  actor: User,
  action: string,
  type: 'user' | 'playlist',
  id: number,
  details: unknown
) {
  await trx.table('admin_audit').insert({
    id: randomUUID(),
    actor_id: actor.id,
    action,
    target_type: type,
    target_id: id,
    details: JSON.stringify(details),
    created_at: new Date(),
  })
}
function account(row: Record<string, any>) {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    email: row.email,
    discordId: row.discord_id,
    createdAt: row.created_at,
    suspendedAt: row.suspended_at,
    isAdmin: isEditorialAdmin({ id: row.id, discordId: row.discord_id }),
    playlistCount: Number(row.playlist_count || 0),
    publicCount: Number(row.public_count || 0),
    privateCount: Number(row.private_count || 0),
    voteCount: Number(row.vote_count || 0),
  }
}
const accountColumns = [
  'users.id',
  'users.full_name',
  'users.username',
  'users.email',
  'users.discord_id',
  'users.created_at',
  'users.suspended_at',
]
function accountQuery() {
  return db
    .from('users')
    .select(...accountColumns)
    .select(
      db.raw(
        '(select count(*) from playlists p where p.user_id = users.id)::int as playlist_count'
      ),
      db.raw(
        '(select count(*) from playlists p where p.user_id = users.id and p.is_public)::int as public_count'
      ),
      db.raw(
        '(select count(*) from playlists p where p.user_id = users.id and not p.is_public)::int as private_count'
      ),
      db.raw('(select count(*) from votes v where v.user_id = users.id)::int as vote_count')
    )
}
function playlistSummary(row: Record<string, any>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    ownerName: row.owner_name || row.owner_username || row.owner_email,
    itemCount: Number(row.item_count || 0),
    voteCount: Number(row.vote_count || 0),
  }
}
function playlistsQuery() {
  return db
    .from('playlists as p')
    .join('users as owner', 'owner.id', 'p.user_id')
    .select(
      'p.*',
      'owner.full_name as owner_name',
      'owner.username as owner_username',
      'owner.email as owner_email'
    )
    .select(
      db.raw(
        '(select count(*) from playlist_items i where i.playlist_id = p.id)::int as item_count'
      ),
      db.raw(
        '(select count(*) from votes v join playlist_items i on i.id = v.playlist_item_id where i.playlist_id = p.id)::int as vote_count'
      )
    )
}
async function paginate(query: ReturnType<typeof accountQuery>, page: number) {
  const count = await query.clone().clearSelect().clearOrder().count('* as total').first()
  const total = Number(count?.total || 0)
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, lastPage)
  const rows = await query.offset((currentPage - 1) * pageSize).limit(pageSize)
  return { rows, pagination: { total, page: currentPage, lastPage, pageSize } }
}

export default class AdminManagement {
  async overview(actor: User) {
    await assertAdmin(actor)
    const totals = await db.rawQuery(
      `select
      (select count(*)::int from users) as accounts,
      (select count(*)::int from users where suspended_at is not null) as suspended,
      (select count(*)::int from users where created_at >= ?) as new_accounts,
      (select count(*)::int from playlists) as playlists,
      (select count(*)::int from playlists where is_public) as public_playlists,
      (select count(*)::int from playlists where not is_public) as private_playlists,
      (select count(*)::int from playlist_items) as items,
      (select count(*)::int from votes) as votes,
      (select count(*)::int from votes where is_smash) as smashes,
      (select count(distinct visitor_id)::int from votes) as participants,
      (select count(*)::int from editorial_proposals where status = 'in_review') as pending_proposals`,
      [DateTime.utc().minus({ days: 30 }).toJSDate()]
    )
    const start = DateTime.now().setZone('Europe/Paris').startOf('day').minus({ days: 29 })
    const activity = await db.rawQuery(
      `select day, sum(accounts)::int as accounts, sum(playlists)::int as playlists, sum(votes)::int as votes from (
      select (created_at at time zone 'UTC' at time zone 'Europe/Paris')::date::text as day, 1 as accounts, 0 as playlists, 0 as votes from users where created_at >= ?
      union all select (created_at at time zone 'UTC' at time zone 'Europe/Paris')::date::text, 0, 1, 0 from playlists where created_at >= ?
      union all select (created_at at time zone 'UTC' at time zone 'Europe/Paris')::date::text, 0, 0, 1 from votes where created_at >= ?
    ) as events group by day order by day`,
      [start.toUTC().toISO()!, start.toUTC().toISO()!, start.toUTC().toISO()!]
    )
    const trend = Array.from({ length: 30 }, (_, index) => {
      const day = start.plus({ days: index }).toISODate()!
      return (
        activity.rows.find((row: { day: string }) => row.day === day) || {
          day,
          accounts: 0,
          playlists: 0,
          votes: 0,
        }
      )
    })
    const recentUsers = await accountQuery().orderBy('users.id', 'desc').limit(5)
    const recentPlaylists = await playlistsQuery().orderBy('p.id', 'desc').limit(5)
    const actions = await db
      .from('admin_audit as a')
      .leftJoin('users as actor', 'actor.id', 'a.actor_id')
      .select('a.*', 'actor.username as actor_name', 'actor.full_name as actor_full_name')
      .orderBy('a.created_at', 'desc')
      .limit(20)
    return {
      totals: totals.rows[0],
      trend,
      recentUsers: recentUsers.map(account),
      recentPlaylists: recentPlaylists.map(playlistSummary),
      actions,
    }
  }
  async users(actor: User, filters: Filter & { status: string }) {
    await assertAdmin(actor)
    const query = accountQuery().orderBy('users.id', 'desc')
    if (filters.q)
      query.where((q) => {
        for (const column of [
          'users.full_name',
          'users.username',
          'users.email',
          'users.discord_id',
        ])
          q.orWhereILike(column, searchTerm(filters.q))
      })
    if (filters.status === 'active') query.whereNull('users.suspended_at')
    if (filters.status === 'suspended') query.whereNotNull('users.suspended_at')
    const page = await paginate(query, filters.page)
    return { users: page.rows.map(account), pagination: page.pagination, filters }
  }
  async user(actor: User, id: number) {
    await assertAdmin(actor)
    const row = await accountQuery().where('users.id', id).first()
    if (!row) throw new AdminError('NOT_FOUND', 'Compte introuvable.')
    const playlists = await this.playlists(actor, {
      q: '',
      visibility: 'all',
      page: 1,
      user_id: id,
    })
    return {
      account: account(row),
      playlists: playlists.playlists,
      pagination: playlists.pagination,
    }
  }
  async playlists(actor: User, filters: Filter & { visibility: string; user_id?: number }) {
    await assertAdmin(actor)
    const query = playlistsQuery().orderBy('p.id', 'desc')
    if (filters.q)
      query.where((q) =>
        q
          .whereILike('p.title', searchTerm(filters.q))
          .orWhereILike('owner.username', searchTerm(filters.q))
          .orWhereILike('owner.email', searchTerm(filters.q))
      )
    if (filters.visibility !== 'all') query.where('p.is_public', filters.visibility === 'public')
    if (filters.user_id) query.where('p.user_id', filters.user_id)
    const page = await paginate(query, filters.page)
    return { playlists: page.rows.map(playlistSummary), pagination: page.pagination, filters }
  }
  async playlist(actor: User, id: number) {
    await assertAdmin(actor)
    const row = await playlistsQuery().where('p.id', id).first()
    if (!row) throw new AdminError('NOT_FOUND', 'Playlist introuvable.')
    const items = await db
      .from('playlist_items')
      .where('playlist_id', id)
      .orderBy('position')
      .orderBy('id')
    return {
      playlist: { ...playlistSummary(row), accent: row.accent },
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        image_url: item.image_url,
        smashes: item.smashes,
        passes: item.passes,
      })),
      revision: playlistRevision(row, items),
    }
  }
  async suspend(
    actor: User,
    id: number,
    input: { suspended: boolean; expected_suspended: boolean; reason: string }
  ) {
    await assertAdmin(actor)
    return db.transaction(async (trx) => {
      const user = await User.query({ client: trx }).where('id', id).forUpdate().first()
      if (!user) throw new AdminError('NOT_FOUND', 'Compte introuvable.')
      if (Boolean(user.suspendedAt) !== input.expected_suspended)
        throw new AdminError(
          'REVISION_CONFLICT',
          'Le statut du compte a changé. Rechargez la page.'
        )
      if (input.suspended && (user.id === actor.id || isEditorialAdmin(user)))
        throw new AdminError(
          'FORBIDDEN',
          'La suspension des administrateurs est désactivée. Gérez leurs droits dans la configuration du serveur.'
        )
      user.suspendedAt = input.suspended ? DateTime.utc() : null
      await user.save()
      if (input.suspended)
        await trx.from('editorial_connections').where('user_id', id).update({ revoked: true })
      await audit(
        trx,
        actor,
        input.suspended ? 'suspend_account' : 'reactivate_account',
        'user',
        id,
        { reason: input.reason }
      )
    })
  }
  async updatePlaylist(actor: User, id: number, input: PlaylistEdit) {
    await assertAdmin(actor)
    const payload = playlistEditSchema.parse(input)
    return db.transaction(async (trx) => {
      const playlist = await trx.from('playlists').where('id', id).forUpdate().first()
      if (!playlist) throw new AdminError('NOT_FOUND', 'Playlist introuvable.')
      const previous = await trx
        .from('playlist_items')
        .where('playlist_id', id)
        .orderBy('position')
        .orderBy('id')
        .forUpdate()
      if (playlistRevision(playlist, previous) !== payload.expected_revision)
        throw new AdminError(
          'REVISION_CONFLICT',
          'La playlist a été modifiée. Rechargez la page avant de continuer.'
        )
      const ids = payload.items.flatMap((item) => (item.id ? [item.id] : []))
      if (
        new Set(ids).size !== ids.length ||
        ids.some((itemId) => !previous.some((item) => item.id === itemId))
      )
        throw new AdminError(
          'VALIDATION_FAILED',
          'Un élément est dupliqué ou appartient à une autre playlist.'
        )
      for (const item of payload.items) {
        const match = /^\/editorial\/media\/([a-f0-9-]{36})$/.exec(item.image_url)
        if (match && !previous.some((entry) => entry.image_url === item.image_url))
          throw new AdminError(
            'VALIDATION_FAILED',
            'Un média éditorial privé ne peut pas être réutilisé depuis une autre playlist.'
          )
      }
      await trx
        .from('playlists')
        .where('id', id)
        .update({
          title: payload.title,
          description: payload.description || null,
          is_public: payload.visibility === 'public',
          accent: payload.accent,
          updated_at: new Date(),
        })
      for (const [position, item] of payload.items.entries()) {
        const value = {
          title: item.title,
          description: item.description || null,
          image_url: item.image_url,
          position,
          updated_at: new Date(),
        }
        if (item.id)
          await trx.from('playlist_items').where({ id: item.id, playlist_id: id }).update(value)
        else
          await trx
            .table('playlist_items')
            .insert({ ...value, playlist_id: id, created_at: new Date() })
      }
      if (ids.length)
        await trx
          .from('playlist_items')
          .where('playlist_id', id)
          .whereNotIn('id', ids)
          .whereIn(
            'id',
            previous.map((item) => item.id)
          )
          .delete()
      else if (previous.length)
        await trx
          .from('playlist_items')
          .whereIn(
            'id',
            previous.map((item) => item.id)
          )
          .delete()
      await audit(trx, actor, 'update_playlist', 'playlist', id, {
        previous_visibility: playlist.is_public ? 'public' : 'private',
        visibility: payload.visibility,
        removed_items: previous.filter((item) => !ids.includes(item.id)).length,
      })
    })
  }
  async deletePlaylist(
    actor: User,
    id: number,
    input: { expected_revision: string; confirm_slug: string }
  ) {
    await assertAdmin(actor)
    return db.transaction(async (trx) => {
      const playlist = await trx.from('playlists').where('id', id).forUpdate().first()
      if (!playlist) throw new AdminError('NOT_FOUND', 'Playlist introuvable.')
      const items = await trx
        .from('playlist_items')
        .where('playlist_id', id)
        .orderBy('position')
        .orderBy('id')
        .forUpdate()
      if (playlistRevision(playlist, items) !== input.expected_revision)
        throw new AdminError('REVISION_CONFLICT', 'La playlist a changé. Rechargez la page.')
      if (input.confirm_slug !== playlist.slug)
        throw new AdminError(
          'VALIDATION_FAILED',
          'Recopiez exactement l’identifiant de la playlist pour confirmer.'
        )
      await audit(trx, actor, 'delete_playlist', 'playlist', id, {
        title: playlist.title,
        slug: playlist.slug,
        item_count: items.length,
      })
      await trx.from('playlists').where('id', id).delete()
    })
  }
}
