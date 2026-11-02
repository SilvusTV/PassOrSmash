import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import User from '#models/user'
import Playlist from '#models/playlist'
import PlaylistItem from '#models/playlist_item'
import Vote from '#models/vote'
import { randomUUID } from 'node:crypto'
import AdminManagement from '#services/admin/management'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { createEditorialServer } from '../../app/mcp/server.js'
import { playlistsWithActivity } from '#services/playlist_activity'

if (process.env.EDITORIAL_DB_TESTS === '1') {
  test.group('Global administration integration', (group) => {
    const service = new AdminManagement()
    let admin: User
    let owner: User
    let other: User
    let playlist: Playlist
    let foreignItem: PlaylistItem
    group.each.setup(async () => {
      if (env.get('DB_DATABASE') !== 'passorsmash_editorial_test')
        throw new Error('Dedicated test database required.')
      await db.rawQuery(
        'TRUNCATE users, playlists, playlist_items, votes, editorial_proposals, editorial_jobs, editorial_audit, editorial_operations, editorial_media, editorial_connections, admin_audit RESTART IDENTITY CASCADE'
      )
      admin = await User.create({
        email: 'admin@example.com',
        fullName: 'Administrateur',
        password: 'test-password',
        discordId: 'global-test-admin',
      })
      owner = await User.create({
        email: 'owner@example.com',
        fullName: 'Créateur',
        username: 'createur',
        password: 'test-password',
        discordId: 'global-test-owner',
      })
      other = await User.create({
        email: 'other@example.com',
        password: 'test-password',
        discordId: 'global-test-other',
      })
      env.set('EDITORIAL_ADMIN_DISCORD_IDS', 'global-test-admin')
      playlist = await Playlist.create({
        userId: owner.id,
        title: 'Sélection privée',
        slug: 'selection-privee',
        isPublic: false,
        accent: 'lime',
      })
      const second = await Playlist.create({
        userId: owner.id,
        title: 'Sélection publique',
        slug: 'selection-publique',
        isPublic: true,
        accent: 'lime',
      })
      const third = await Playlist.create({
        userId: other.id,
        title: 'Autre sélection',
        slug: 'autre-selection',
        isPublic: true,
        accent: 'violet',
      })
      for (const entry of [playlist, second, third])
        await PlaylistItem.createMany(
          [0, 1].map((index) => ({
            playlistId: entry.id,
            position: index,
            title: `Image ${index + 1}`,
            imageUrl: 'https://example.com/image.png',
          }))
        )
      const firstItem = await PlaylistItem.query()
        .where('playlist_id', playlist.id)
        .orderBy('position')
        .firstOrFail()
      foreignItem = await PlaylistItem.query().where('playlist_id', third.id).firstOrFail()
      await Vote.createMany([
        { playlistItemId: firstItem.id, userId: owner.id, visitorId: 'visitor-one', isSmash: true },
        {
          playlistItemId: foreignItem.id,
          userId: other.id,
          visitorId: 'visitor-two',
          isSmash: false,
        },
        {
          playlistItemId: foreignItem.id,
          userId: owner.id,
          visitorId: 'visitor-one',
          isSmash: true,
        },
      ])
    })
    async function editing() {
      const current = await service.playlist(admin, playlist.id)
      return {
        expected_revision: current.revision,
        title: current.playlist.title,
        description: current.playlist.description || '',
        visibility: current.playlist.isPublic ? ('public' as const) : ('private' as const),
        accent: 'lime' as const,
        items: current.items.map(({ id, title, description, image_url }) => ({
          id,
          title,
          description,
          image_url,
        })),
      }
    }
    test('playlist cards count distinct voting visitors using historical votes', async ({
      assert,
    }) => {
      const items = await PlaylistItem.query().where('playlist_id', playlist.id).orderBy('position')
      const first = await Vote.query().where('playlist_item_id', items[0].id).firstOrFail()
      await Vote.create({ playlistItemId: items[1].id, visitorId: first.visitorId, isSmash: false })
      const once = await playlistsWithActivity().where('playlists.id', playlist.id).firstOrFail()
      assert.equal(Number(once.$extras.participation_count), 1)
      await Vote.create({
        playlistItemId: items[0].id,
        visitorId: 'another-participant',
        isSmash: true,
      })
      const twice = await playlistsWithActivity().where('playlists.id', playlist.id).firstOrFail()
      assert.equal(Number(twice.$extras.participation_count), 2)
      const empty = await Playlist.create({
        userId: owner.id,
        title: 'Sans votes',
        slug: 'sans-votes',
        isPublic: true,
        accent: 'lime',
        plays: 99,
      })
      const zero = await playlistsWithActivity().where('playlists.id', empty.id).firstOrFail()
      assert.equal(Number(zero.$extras.participation_count), 0)
    })
    test('MCP edits an owned playlist, preserves votes and rejects stale or foreign writes', async ({
      assert,
    }) => {
      playlist.userId = admin.id
      await playlist.save()
      const handler = createMcpHandler(() =>
        createEditorialServer({
          userId: admin.id,
          identity: 'mcp-test',
          scopes: ['editorial:read', 'editorial:write'],
        })
      )
      async function call(name: string, args: unknown) {
        const response = await handler.fetch(
          new Request('http://localhost/mcp', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'accept': 'application/json, text/event-stream',
              'mcp-protocol-version': '2025-11-25',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: { name, arguments: args },
            }),
          })
        )
        const raw = await response.text()
        return JSON.parse(raw.startsWith('event:') ? raw.split('data: ')[1].split('\n')[0] : raw)
      }
      try {
        const snapshot = await call('get_playlist', { playlist_id: playlist.id })
        const current = await editing()
        assert.equal(
          snapshot.result.structuredContent.data.edit.revision,
          current.expected_revision
        )
        const input = {
          ...(await editing()),
          playlist_id: playlist.id,
          title: 'Modification depuis le MCP',
        }
        const saved = await call('update_playlist', input)
        assert.isUndefined(saved.result.isError)
        assert.equal(saved.result.structuredContent.data.playlist.title, input.title)
        assert.lengthOf(await Vote.all(), 3)
        const stale = await call('update_playlist', input)
        assert.isTrue(stale.result.isError)
        assert.include(stale.result.content[0].text, 'REVISION_CONFLICT')
        const foreign = await call('update_playlist', {
          ...input,
          playlist_id: foreignItem.playlistId,
        })
        assert.isTrue(foreign.result.isError)
        assert.include(foreign.result.content[0].text, 'NOT_FOUND')
      } finally {
        await handler.close()
      }
    })
    test('global statistics include every account and both playlist visibilities', async ({
      assert,
    }) => {
      const overview = await service.overview(admin)
      assert.equal(overview.totals.accounts, 3)
      assert.equal(overview.totals.playlists, 3)
      assert.equal(overview.totals.public_playlists, 2)
      assert.equal(overview.totals.private_playlists, 1)
      assert.equal(overview.totals.items, 6)
      assert.equal(overview.totals.votes, 3)
      assert.equal(overview.totals.smashes, 2)
      assert.equal(overview.totals.participants, 2)
      assert.lengthOf(overview.trend, 30)
      const user = await service.user(admin, owner.id)
      assert.equal(user.account.playlistCount, 2)
      assert.equal(user.account.voteCount, 2)
      assert.isFalse('password' in user.account)
      assert.isFalse('visitor_id' in overview.totals)
    })
    test('search, visibility, ownership and pagination are applied before limiting results', async ({
      assert,
    }) => {
      const privatePage = await service.playlists(admin, { q: '', page: 1, visibility: 'private' })
      assert.equal(privatePage.pagination.total, 1)
      assert.equal(privatePage.playlists[0].id, playlist.id)
      const filtered = await service.playlists(admin, {
        q: 'Autre',
        page: 1,
        visibility: 'all',
        user_id: owner.id,
      })
      assert.equal(filtered.pagination.total, 0)
      await User.createMany(
        Array.from({ length: 25 }, (_, index) => ({
          email: `bulk-${index}@example.com`,
          password: 'test-password',
        }))
      )
      const first = await service.users(admin, { q: '', page: 1, status: 'all' })
      const second = await service.users(admin, { q: '', page: 2, status: 'all' })
      assert.lengthOf(first.users, 25)
      assert.lengthOf(second.users, 3)
      const search = await service.users(admin, {
        q: 'owner@example.com',
        page: 1,
        status: 'active',
      })
      assert.equal(search.pagination.total, 1)
      assert.equal(search.users[0].id, owner.id)
    })
    test('editing another account’s playlist preserves retained item IDs, ownership and votes', async ({
      assert,
    }) => {
      const input = await editing()
      const itemIds = input.items.map((item) => item.id)
      await service.updatePlaylist(admin, playlist.id, {
        ...input,
        title: 'Titre administré',
        visibility: 'public',
        items: [...input.items].reverse(),
      })
      const updated = await Playlist.findOrFail(playlist.id)
      const items = await PlaylistItem.query().where('playlist_id', playlist.id).orderBy('position')
      assert.equal(updated.userId, owner.id)
      assert.isTrue(updated.isPublic)
      assert.deepEqual(
        items.map((item) => item.id),
        [...itemIds].reverse()
      )
      assert.lengthOf(await Vote.all(), 3)
      const action = await db.from('admin_audit').first()
      assert.equal(action.actor_id, admin.id)
    })
    test('rejects stale revisions, foreign items and duplicate item IDs atomically', async ({
      assert,
    }) => {
      const input = await editing()
      await assert.rejects(
        () =>
          service.updatePlaylist(admin, playlist.id, {
            ...input,
            items: [{ ...input.items[0], id: foreignItem.id }, input.items[1]],
          }),
        /autre playlist/
      )
      await assert.rejects(
        () =>
          service.updatePlaylist(admin, playlist.id, {
            ...input,
            items: [input.items[0], input.items[0]],
          }),
        /dupliqué/
      )
      await service.updatePlaylist(admin, playlist.id, { ...input, title: 'Version récente' })
      await assert.rejects(
        () => service.updatePlaylist(admin, playlist.id, { ...input, title: 'Version obsolète' }),
        /modifiée/
      )
      const current = await Playlist.findOrFail(playlist.id)
      assert.equal(current.title, 'Version récente')
      assert.lengthOf(await Vote.all(), 3)
    })
    test('explicit item removal deletes only its votes and preserves newly added items', async ({
      assert,
    }) => {
      const input = await editing()
      await service.updatePlaylist(admin, playlist.id, {
        ...input,
        items: [
          input.items[1],
          { title: 'Image ajoutée', description: '', image_url: 'https://example.com/new.png' },
        ],
      })
      const items = await PlaylistItem.query().where('playlist_id', playlist.id).orderBy('position')
      assert.lengthOf(items, 2)
      assert.equal(items[0].id, input.items[1].id)
      assert.equal(items[1].title, 'Image ajoutée')
      assert.lengthOf(await Vote.all(), 2)
    })
    test('suspension is reversible, revokes OAuth access and protects administrator accounts', async ({
      assert,
    }) => {
      const connectionId = randomUUID()
      await db.table('editorial_connections').insert({
        id: connectionId,
        subject: String(owner.id),
        client_id: 'test-client',
        user_id: owner.id,
        scopes: JSON.stringify(['editorial:read']),
        expires_at: new Date(Date.now() + 60000),
      })
      await service.suspend(admin, owner.id, {
        suspended: true,
        expected_suspended: false,
        reason: 'Motif de recette',
      })
      const suspended = await User.findOrFail(owner.id)
      assert.isNotNull(suspended.suspendedAt)
      const connection = await db.from('editorial_connections').where('id', connectionId).first()
      assert.isTrue(connection.revoked)
      await assert.rejects(
        () =>
          service.suspend(admin, owner.id, {
            suspended: true,
            expected_suspended: false,
            reason: 'Ancienne version',
          }),
        /statut/
      )
      await service.suspend(admin, owner.id, {
        suspended: false,
        expected_suspended: true,
        reason: 'Accès rétabli',
      })
      const reactivated = await User.findOrFail(owner.id)
      assert.isNull(reactivated.suspendedAt)
      await assert.rejects(
        () =>
          service.suspend(admin, admin.id, {
            suspended: true,
            expected_suspended: false,
            reason: 'Interdit',
          }),
        /administrateurs/
      )
      assert.lengthOf(await Playlist.all(), 3)
      assert.lengthOf(await Vote.all(), 3)
    })
    test('ordinary users cannot use global administration services', async ({ assert }) => {
      await assert.rejects(() => service.overview(owner), /administrateur/)
      await assert.rejects(() => service.user(owner, other.id), /administrateur/)
      await assert.rejects(() => service.playlist(owner, playlist.id), /administrateur/)
      const input = await editing()
      await assert.rejects(
        () => service.updatePlaylist(owner, playlist.id, input),
        /administrateur/
      )
    })
    test('playlist deletion requires the exact confirmation and is recorded separately from its removed data', async ({
      assert,
    }) => {
      const input = await editing()
      await assert.rejects(
        () =>
          service.deletePlaylist(admin, playlist.id, {
            expected_revision: input.expected_revision,
            confirm_slug: 'wrong',
          }),
        /exactement/
      )
      await service.deletePlaylist(admin, playlist.id, {
        expected_revision: input.expected_revision,
        confirm_slug: playlist.slug,
      })
      assert.isNull(await Playlist.find(playlist.id))
      assert.lengthOf(await Playlist.all(), 2)
      assert.lengthOf(await Vote.all(), 2)
      const action = await db.from('admin_audit').where('action', 'delete_playlist').first()
      assert.equal(action.target_id, playlist.id)
    })
  })
}
