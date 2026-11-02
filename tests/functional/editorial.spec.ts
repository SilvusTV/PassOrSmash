import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import User from '#models/user'
import Playlist from '#models/playlist'
import PlaylistItem from '#models/playlist_item'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import Proposals from '#services/editorial/proposals'
import EditorialJobs from '#services/editorial/jobs'
import { contentSchema, settingsSchema, scopes, type Actor } from '#services/editorial/contracts'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { createEditorialServer } from '../../app/mcp/server.js'
import { mkdir, writeFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import sharp from 'sharp'
import { authorizeMcpClaims } from '#services/editorial/mcp_access'

// Explicit opt-in: these integration tests only reset the dedicated disposable database.
if (process.env.EDITORIAL_DB_TESTS === '1') {
  test.group('Editorial PostgreSQL integration', (group) => {
    const service = new Proposals()
    let actor: Actor
    let mediaId: ReturnType<typeof randomUUID>
    const provenance = {
      url: 'https://example.com/image.png',
      credit: 'Auteur test',
      license: 'CC0' as const,
      license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    }
    const content = () =>
      contentSchema.parse({
        title: 'Les jeux de la semaine',
        category: 'jeux',
        sources: [
          {
            title: 'Annonce officielle',
            url: 'https://example.com/news',
            retrieved_at: new Date().toISOString(),
          },
        ],
        items: [1, 2].map((i) => ({
          title: `Jeu ${i}`,
          media_id: mediaId,
          source_urls: ['https://example.com/news'],
        })),
      })
    group.each.setup(async () => {
      if (env.get('DB_DATABASE') !== 'passorsmash_editorial_test')
        throw new Error('Use the dedicated passorsmash_editorial_test database.')
      await db.rawQuery(
        'TRUNCATE editorial_audit, editorial_operations, editorial_revisions, editorial_proposals, editorial_jobs, editorial_media, editorial_connections, editorial_settings, votes, playlist_items, playlists, users RESTART IDENTITY CASCADE'
      )
      const user = await User.create({
        email: 'editorial-test@example.com',
        password: 'test-password',
        discordId: 'editorial-test-admin',
      })
      env.set('EDITORIAL_ADMIN_DISCORD_IDS', 'editorial-test-admin')
      actor = { userId: user.id, identity: `dashboard:${user.id}`, scopes: [...scopes] }
      mediaId = randomUUID()
      await mkdir(app.tmpPath('editorial'), { recursive: true })
      await writeFile(
        app.tmpPath('editorial', `${mediaId}.png`),
        await sharp({ create: { width: 120, height: 120, channels: 3, background: '#fff' } })
          .png()
          .toBuffer()
      )
      await db.table('editorial_media').insert({
        id: mediaId,
        user_id: user.id,
        path: `${mediaId}.png`,
        provenance: JSON.stringify(provenance),
        width: 120,
        height: 120,
        created_at: new Date(),
      })
    })
    test('concurrent identical creation is idempotent and rejects changed inputs', async ({
      assert,
    }) => {
      const input = content()
      const [first, second] = await Promise.all([
        service.create(actor, input, 'same-operation-key'),
        service.create(actor, input, 'same-operation-key'),
      ])
      assert.equal(first.proposal_id, second.proposal_id)
      await assert.rejects(
        () => service.create(actor, { ...input, title: 'Autre contenu' }, 'same-operation-key'),
        /autre contenu/
      )
    })
    test('OAuth authorization checks scopes, identity, expiration and revocation', async ({
      assert,
    }) => {
      const connectionId = randomUUID()
      await db.table('editorial_connections').insert({
        id: connectionId,
        subject: 'oauth-user',
        client_id: 'test-client',
        user_id: actor.userId,
        scopes: JSON.stringify(['editorial:read']),
        expires_at: new Date(Date.now() + 60000),
      })
      const claims = {
        sub: 'oauth-user',
        client_id: 'test-client',
        scope: 'editorial:read editorial:write editorial:generate',
      }
      const authorized = await authorizeMcpClaims(claims)
      assert.deepEqual(authorized.scopes, ['editorial:read'])
      await assert.rejects(() => authorizeMcpClaims({ ...claims, sub: 'other-user' }), /inconnue/)
      await assert.rejects(
        () => authorizeMcpClaims({ ...claims, scope: 'editorial:write' }),
        /portée/
      )
      await db.from('editorial_connections').where('id', connectionId).update({ revoked: true })
      await assert.rejects(() => authorizeMcpClaims(claims), /révoquée/)
      await db
        .from('editorial_connections')
        .where('id', connectionId)
        .update({ revoked: false, expires_at: new Date(Date.now() - 1000) })
      await assert.rejects(() => authorizeMcpClaims(claims), /expirée/)
    })
    test('concurrent edits preserve exactly one revision', async ({ assert }) => {
      const proposal = await service.create(actor, content(), randomUUID())
      const results = await Promise.allSettled(
        ['Version A', 'Version B'].map((title) =>
          service.mutate(actor, proposal.proposal_id, 1, 'update', (value) => ({ ...value, title }))
        )
      )
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
      const edited = await service.get(actor, proposal.proposal_id)
      assert.equal(edited.revision, 2)
    })
    test('submission freezes contents and only dashboard approval publishes exactly once', async ({
      assert,
    }) => {
      const proposal = await service.create(actor, content(), randomUUID())
      const assistant = { ...actor, identity: 'mcp:client-test' }
      await service.submit(assistant, proposal.proposal_id, 1, randomUUID())
      await assert.rejects(
        () => service.mutate(assistant, proposal.proposal_id, 1, 'update', (value) => value),
        /brouillon/
      )
      await assert.rejects(() => service.publish(assistant, proposal.proposal_id, 1), /humaine/)
      const published = await Promise.all([
        service.publish(actor, proposal.proposal_id, 1),
        service.publish(actor, proposal.proposal_id, 1),
      ])
      assert.equal(published[0].playlist_id, published[1].playlist_id)
      assert.lengthOf(await Playlist.all(), 1)
      assert.lengthOf(await PlaylistItem.all(), 2)
      const row = await db.from('editorial_proposals').where('id', proposal.proposal_id).first()
      assert.equal(row.approved_by, actor.userId)
      assert.equal(row.approved_revision, 1)
    })
    test('failed publication rolls back every public row', async ({ assert }) => {
      const proposal = await service.create(actor, content(), randomUUID())
      await service.submit(actor, proposal.proposal_id, 1, randomUUID())
      // Force a database failure after playlist creation but during item insertion.
      await db.rawQuery(
        "CREATE OR REPLACE FUNCTION editorial_test_fail_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated item failure'; END; $$"
      )
      await db.rawQuery(
        'CREATE TRIGGER editorial_test_item_failure BEFORE INSERT ON playlist_items FOR EACH ROW EXECUTE FUNCTION editorial_test_fail_item()'
      )
      try {
        await assert.rejects(
          () => service.publish(actor, proposal.proposal_id, 1),
          /simulated item failure/
        )
        assert.lengthOf(await Playlist.all(), 0)
        const rolledBack = await service.get(actor, proposal.proposal_id)
        assert.equal(rolledBack.status, 'in_review')
      } finally {
        await db.rawQuery('DROP TRIGGER editorial_test_item_failure ON playlist_items')
        await db.rawQuery('DROP FUNCTION editorial_test_fail_item()')
      }
    })
    test('reject, reopen and stale preview never publish', async ({ assert }) => {
      const proposal = await service.create(actor, content(), randomUUID())
      await service.submit(actor, proposal.proposal_id, 1, randomUUID())
      await service.transition(actor, proposal.proposal_id, 1, 'reject')
      await assert.rejects(() => service.publish(actor, proposal.proposal_id, 1), /changé/)
      await service.transition(actor, proposal.proposal_id, 2, 'reopen')
      const reopened = await service.get(actor, proposal.proposal_id)
      assert.equal(reopened.revision, 3)
      assert.lengthOf(await Playlist.all(), 0)
    })
    test('ownership checks hide proposals and media from outsiders', async ({ assert }) => {
      const proposal = await service.create(actor, content(), randomUUID())
      await assert.rejects(
        () => service.get({ ...actor, userId: actor.userId + 1 }, proposal.proposal_id),
        /introuvable/
      )
      const privateImage = await fetch(`http://localhost:3333/editorial/media/${mediaId}`)
      assert.equal(privateImage.status, 404)
      const dashboard = await fetch('http://localhost:3333/admin/editorial', { redirect: 'manual' })
      assert.equal(dashboard.status, 302)
      await service.submit(actor, proposal.proposal_id, 1, randomUUID())
      await service.publish(actor, proposal.proposal_id, 1)
      const publicImage = await fetch(`http://localhost:3333/editorial/media/${mediaId}`)
      assert.equal(publicImage.status, 200)
      assert.include(publicImage.headers.get('content-type')!, 'image/png')
    })
    test('MCP strict schema rejects status injection and reports business errors as errors', async ({
      assert,
    }) => {
      const handler = createMcpHandler(() => createEditorialServer(actor))
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
        const injection = await call('create_proposal', {
          content: { ...content(), status: 'published' },
          idempotency_key: randomUUID(),
        })
        assert.isTrue(!!injection.error || injection.result?.isError === true)
        const missing = await call('get_proposal', { proposal_id: randomUUID() })
        assert.isTrue(missing.result.isError)
        assert.include(missing.result.content[0].text, 'NOT_FOUND')
        assert.lengthOf(await Playlist.all(), 0)
      } finally {
        await handler.close()
      }
    })
    test('scheduler deduplicates slots, catches up once and respects pause', async ({ assert }) => {
      const settings = settingsSchema.parse({ enabled: true, automation_user_id: actor.userId })
      await db.table('editorial_settings').insert({ id: 1, settings: JSON.stringify(settings) })
      const jobs = new EditorialJobs()
      const now = DateTime.fromISO('2026-11-03T10:05:00', { zone: 'Europe/Paris' })
      await Promise.all([jobs.schedule(now), jobs.schedule(now)])
      assert.lengthOf(await db.from('editorial_jobs'), 1)
      await db
        .from('editorial_settings')
        .where('id', 1)
        .update({ settings: JSON.stringify({ ...settings, enabled: false }) })
      await jobs.schedule(now.plus({ days: 3 }))
      assert.lengthOf(await db.from('editorial_jobs'), 1)
    })
    test('simulated background generation produces a draft and reuses its result after interruption', async ({
      assert,
    }) => {
      let calls = 0
      const input = content()
      input.items.forEach((item) => {
        delete item.media_id
      })
      const worker = new EditorialJobs({
        news: {
          find: async () => [
            {
              id: 'a'.repeat(64),
              title: 'Actualité jeux',
              category: 'jeux',
              source: {
                title: 'Officiel',
                url: 'https://example.com/news',
                published_at: new Date().toISOString(),
                retrieved_at: new Date().toISOString(),
              },
            },
          ],
        },
        generation: {
          generate: async () => {
            calls++
            return {
              content: input,
              images: [0, 1].map((item_index) => ({ item_index, provenance })),
            }
          },
        },
        media: { import: async () => ({ media_id: mediaId, width: 120, height: 120, provenance }) },
      })
      const job = await worker.enqueue(
        actor,
        'generation',
        { topic: 'Actualité', category: 'jeux', item_count: 2 },
        randomUUID()
      )
      await worker.workOne()
      const first = await db.from('editorial_jobs').where('id', job.job_id).first()
      assert.equal(first.status, 'succeeded')
      await db
        .from('editorial_jobs')
        .where('id', job.job_id)
        .update({ status: 'running', lease_until: new Date(Date.now() - 1000) })
      await worker.workOne()
      assert.equal(calls, 1)
      assert.lengthOf(await db.from('editorial_proposals'), 1)
      assert.lengthOf(await Playlist.all(), 0)
    })
    test('parallel image imports survive unrelated edits without losing text or media', async ({
      assert,
    }) => {
      const input = content()
      input.items.forEach((item) => {
        delete item.media_id
      })
      const created = await service.create(actor, input, randomUUID())
      const proposal = await service.get(actor, created.proposal_id)
      const worker = new EditorialJobs({
        news: { find: async () => [] },
        generation: {
          generate: async () => {
            throw new Error('unexpected generation')
          },
        },
        media: { import: async () => ({ media_id: mediaId, width: 120, height: 120, provenance }) },
      })
      const jobs = await Promise.all(
        proposal.content.items.map((item: { id: string }) =>
          worker.enqueue(
            actor,
            'image',
            {
              proposal_id: proposal.id,
              expected_revision: 1,
              item_id: item.id,
              provenance,
            },
            randomUUID()
          )
        )
      )
      await service.mutate(actor, proposal.id, 1, 'update', (value) => ({
        ...value,
        title: 'Texte modifié pendant les imports',
      }))
      await Promise.all([worker.workOne(), worker.workOne()])
      const saved = await service.get(actor, proposal.id)
      assert.equal(saved.revision, 4)
      assert.equal(saved.content.title, 'Texte modifié pendant les imports')
      assert.isTrue(
        saved.content.items.every((item: { media_id: string }) => item.media_id === mediaId)
      )
      for (const job of jobs) {
        const row = await db.from('editorial_jobs').where('id', job.job_id).first()
        assert.equal(row.status, 'succeeded', JSON.stringify(row.error))
      }
      // Worker redelivery must not increment the revision twice.
      await db
        .from('editorial_jobs')
        .where('id', jobs[0].job_id)
        .update({ status: 'running', lease_until: new Date(0) })
      await worker.workOne()
      const replayed = await service.get(actor, proposal.id)
      assert.equal(replayed.revision, 4)
    })
    test('two replacements of one image never silently overwrite each other', async ({
      assert,
    }) => {
      const input = content()
      input.items.forEach((item) => {
        delete item.media_id
      })
      const created = await service.create(actor, input, randomUUID())
      const proposal = await service.get(actor, created.proposal_id)
      const worker = new EditorialJobs({
        news: { find: async () => [] },
        generation: {
          generate: async () => {
            throw new Error('unexpected generation')
          },
        },
        media: { import: async () => ({ media_id: mediaId, width: 120, height: 120, provenance }) },
      })
      const jobs = []
      for (let i = 0; i < 2; i++)
        jobs.push(
          await worker.enqueue(
            actor,
            'image',
            {
              proposal_id: proposal.id,
              expected_revision: 1,
              item_id: proposal.content.items[0].id,
              provenance,
            },
            randomUUID()
          )
        )
      await worker.workOne()
      await worker.workOne()
      const states = await db.from('editorial_jobs').whereIn(
        'id',
        jobs.map((job) => job.job_id)
      )
      assert.deepEqual(states.map((job) => job.status).sort(), ['failed', 'succeeded'])
      assert.equal(states.find((job) => job.status === 'failed').error.code, 'REVISION_CONFLICT')
    })
    test('MCP creates privately, edits and deduplicates playlists through the real SDK', async ({
      assert,
    }) => {
      const handler = createMcpHandler(() =>
        createEditorialServer({ ...actor, identity: 'mcp:integration' })
      )
      const call = async (name: string, args: unknown) => {
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
          .result
      }
      try {
        const input = {
          title: 'Création MCP',
          idempotency_key: randomUUID(),
          items: [1, 2].map((n) => ({
            title: `Image ${n}`,
            description: '',
            image_url: 'https://example.com/image.png',
          })),
        }
        const created = await call('create_playlist', input)
        assert.isUndefined(created.isError, JSON.stringify(created))
        const data = created.structuredContent.data
        assert.isFalse(data.playlist.isPublic)
        assert.lengthOf(data.items, 2)
        const again = await call('create_playlist', input)
        assert.equal(again.structuredContent.data.playlist.id, data.playlist.id)
        assert.lengthOf(await Playlist.all(), 1)
        const changedKey = await call('create_playlist', { ...input, title: 'Autre titre' })
        assert.isTrue(changedKey.isError)
        const snapshot = await call('get_playlist', { playlist_id: data.playlist.id })
        assert.equal(snapshot.structuredContent.data.edit.revision, data.revision)
        const items = data.items
          .map(({ id, title, description, image_url }: any) => ({
            id,
            title,
            description,
            image_url,
          }))
          .reverse()
        const edit = {
          playlist_id: data.playlist.id,
          expected_revision: data.revision,
          title: 'Édition MCP',
          description: '',
          accent: 'coral',
          visibility: 'public',
          items,
        }
        const saved = await call('update_playlist', edit)
        assert.isUndefined(saved.isError, JSON.stringify(saved))
        assert.isTrue(saved.structuredContent.data.playlist.isPublic)
        assert.deepEqual(
          saved.structuredContent.data.items.map((item: { id: number }) => item.id),
          items.map((item: { id: number }) => item.id)
        )
        const stale = await call('update_playlist', edit)
        assert.isTrue(stale.isError)
        assert.include(stale.content[0].text, 'REVISION_CONFLICT')
        const invalid = await call('create_playlist', {
          ...input,
          idempotency_key: randomUUID(),
          items: input.items.map((item) => ({ ...item, image_url: `/editorial/media/${mediaId}` })),
        })
        assert.isTrue(invalid.isError)
        assert.lengthOf(await Playlist.all(), 1)
      } finally {
        await handler.close()
      }
    })
    test('budget ceiling stops a provider before any paid call', async ({ assert }) => {
      const settings = settingsSchema.parse({
        daily_budget_cents: 1,
        generation_call_cost_cents: 50,
      })
      await db.table('editorial_settings').insert({ id: 1, settings: JSON.stringify(settings) })
      let calls = 0
      const worker = new EditorialJobs({
        news: {
          find: async () => [
            {
              id: 'a'.repeat(64),
              title: 'Sujet',
              category: 'jeux',
              source: {
                title: 'Officiel',
                url: 'https://example.com/news',
                published_at: new Date().toISOString(),
                retrieved_at: new Date().toISOString(),
              },
            },
          ],
        },
        generation: {
          generate: async () => {
            calls++
            throw new Error('should not call')
          },
        },
        media: {
          import: async () => {
            throw new Error('should not import')
          },
        },
      })
      const job = await worker.enqueue(
        actor,
        'generation',
        { topic: 'Sujet', category: 'jeux' },
        randomUUID()
      )
      await worker.workOne()
      const row = await db.from('editorial_jobs').where('id', job.job_id).first()
      assert.equal(row.error.code, 'BUDGET_EXCEEDED')
      assert.equal(calls, 0)
      assert.lengthOf(await Playlist.all(), 0)
    })
  })
}
