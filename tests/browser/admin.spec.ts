import { test } from '@japa/runner'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Playlist from '#models/playlist'
import PlaylistItem from '#models/playlist_item'
import Vote from '#models/vote'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import type { BrowserContext } from 'playwright'
import AdminManagement from '#services/admin/management'
import { playlistsWithActivity } from '#services/playlist_activity'

const base = 'http://localhost:3333'
if (process.env.EDITORIAL_DB_TESTS === '1') {
  test.group('Administration browser', (group) => {
    let admin: User
    let owner: User
    let playlist: Playlist
    group.each.setup(async () => {
      if (env.get('DB_DATABASE') !== 'passorsmash_editorial_test')
        throw new Error('Dedicated test database required.')
      const key = randomUUID().slice(0, 16)
      admin = await User.create({
        email: `admin-${key}@example.com`,
        fullName: 'Responsable de recette',
        discordId: `adm-${key}`,
        password: 'test-password',
      })
      owner = await User.create({
        email: `owner-${key}@example.com`,
        fullName: `Créateur ${key}`,
        discordId: `own-${key}`,
        password: 'test-password',
      })
      env.set('EDITORIAL_ADMIN_DISCORD_IDS', admin.discordId!)
      playlist = await Playlist.create({
        userId: owner.id,
        title: `Playlist confidentielle ${key}`,
        slug: `privee-${key}`,
        isPublic: false,
        accent: 'lime',
      })
      const items = await PlaylistItem.createMany(
        [0, 1].map((position) => ({
          playlistId: playlist.id,
          title: `Élément ${position + 1}`,
          imageUrl: `${base}/favicon.svg`,
          position,
        }))
      )
      await Vote.create({
        playlistItemId: items[0].id,
        visitorId: `v-${key}`,
        userId: owner.id,
        isSmash: true,
      })
    })
    async function csrf(context: BrowserContext) {
      const cookies = await context.cookies(base)
      const token = cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')
      if (!token) throw new Error('CSRF cookie missing')
      return { 'X-XSRF-TOKEN': decodeURIComponent(token.value) }
    }
    test('a browser can play twice while duplicate votes within a game are ignored', async ({
      browserContext,
      assert,
    }) => {
      playlist.isPublic = true
      await playlist.save()
      const page = await browserContext.newPage()
      await page.goto(`${base}/p/${playlist.slug}`)
      const items = await PlaylistItem.query().where('playlist_id', playlist.id).orderBy('position')
      const sessionId = randomUUID()
      const headers = await csrf(browserContext)
      const send = (itemId: number, session: string) =>
        browserContext.request.post(`${base}/vote`, {
          headers,
          data: { itemId, choice: 'smash', sessionId: session },
          maxRedirects: 0,
        })
      const responses = await Promise.all([
        send(items[0].id, sessionId),
        send(items[0].id, sessionId),
      ])
      responses.forEach((response) => assert.equal(response.status(), 302))
      await send(items[1].id, sessionId)
      const replay = await send(items[0].id, randomUUID())
      assert.equal(replay.status(), 302)
      const firstItem = await PlaylistItem.findOrFail(items[0].id)
      assert.equal(firstItem.smashes, 2)
      const current = await playlistsWithActivity().where('playlists.id', playlist.id).firstOrFail()
      // One historical participant from setup, plus two new games in the same browser.
      assert.equal(Number(current.$extras.participation_count), 3)
      assert.equal(
        await Vote.query()
          .where('playlist_item_id', items[0].id)
          .count('* as total')
          .then((rows) => Number(rows[0].$extras.total)),
        3
      )
    })
    test('administrator browses global stats and private playlists, edits without losing votes and deletes only after confirmation', async ({
      browserContext,
      assert,
    }) => {
      await browserContext.loginAs(admin)
      const page = await browserContext.newPage()
      page.setDefaultTimeout(30000)
      await page.setViewportSize({ width: 1440, height: 1000 })
      const response = await page.goto(`${base}/admin`)
      assert.equal(response!.status(), 200)
      assert.include(response!.headers()['cache-control'], 'no-store')
      await page.getByRole('heading', { name: 'Vue d’ensemble', exact: true }).waitFor()
      await page.screenshot({ path: 'tmp/admin-overview-desktop.png', fullPage: true })
      await page.setViewportSize({ width: 390, height: 844 })
      await page.screenshot({ path: 'tmp/admin-overview-mobile.png', fullPage: true })
      assert.isTrue(
        await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
      )
      await page.getByRole('link', { name: 'Comptes', exact: true }).click()
      await page.getByLabel('Rechercher un compte').fill(owner.email)
      await page.getByRole('button', { name: 'Rechercher', exact: true }).click()
      await page.getByRole('link', { name: owner.fullName!, exact: true }).click()
      await page.getByRole('heading', { name: owner.fullName!, exact: true }).waitFor()
      await page.getByRole('link', { name: playlist.title, exact: true }).click()
      await page.getByLabel('Titre de la playlist').fill('Playlist modifiée par un administrateur')
      await page.getByLabel('Visibilité', { exact: true }).selectOption('public')
      await page.getByRole('button', { name: 'Descendre', exact: true }).first().click()
      await page.getByRole('button', { name: 'Enregistrer les modifications', exact: true }).click()
      await page
        .getByRole('heading', { name: 'Playlist modifiée par un administrateur', exact: true })
        .first()
        .waitFor()
      const votes = await Vote.query().where('user_id', owner.id)
      assert.lengthOf(votes, 1)
      const updated = await Playlist.findOrFail(playlist.id)
      assert.equal(updated.userId, owner.id)
      assert.isTrue(updated.isPublic)
      await page.screenshot({ path: 'tmp/admin-playlist-mobile.png', fullPage: true })
      await page.getByLabel('Identifiant de confirmation').fill(playlist.slug)
      await page.getByRole('button', { name: 'Supprimer définitivement cette playlist' }).click()
      await page.getByRole('heading', { name: 'Playlists', exact: true }).waitFor()
      assert.isNull(await Playlist.find(playlist.id))
    })
    test('suspension blocks an existing session and password login, then allows reactivation', async ({
      browserContext,
      browser,
      assert,
    }) => {
      await browserContext.loginAs(admin)
      const page = await browserContext.newPage()
      await page.goto(`${base}/admin/users/${owner.id}`)
      await page.getByLabel('Motif', { exact: true }).fill('Suspension de recette')
      await page.getByRole('button', { name: 'Suspendre ce compte' }).click()
      await page.getByRole('button', { name: 'Réactiver le compte' }).waitFor()
      const existing = await browser.newContext()
      await existing.loginAs(owner)
      const existingPage = await existing.newPage()
      const blocked = await existingPage.goto(`${base}/dashboard`)
      assert.equal(blocked!.status(), 403)
      await existing.close()
      const fresh = await browser.newContext()
      const freshPage = await fresh.newPage()
      await freshPage.goto(`${base}/login`)
      const login = await fresh.request.post(`${base}/login`, {
        headers: await csrf(fresh),
        data: { email: owner.email, password: 'test-password' },
        maxRedirects: 0,
      })
      assert.equal(login.status(), 403)
      assert.include(await login.text(), 'suspendu')
      await fresh.close()
      await page.getByLabel('Motif', { exact: true }).fill('Réactivation de recette')
      await page.getByRole('button', { name: 'Réactiver le compte' }).click()
      await page.getByRole('button', { name: 'Suspendre ce compte' }).waitFor()
      const active = await User.findOrFail(owner.id)
      assert.isNull(active.suspendedAt)
    })
    test('ordinary and anonymous visitors cannot read admin data or change another account’s playlist', async ({
      browser,
      assert,
    }) => {
      const anonymous = await browser.newContext()
      const anonymousPage = await anonymous.newPage()
      await anonymousPage.goto(`${base}/admin`)
      assert.include(anonymousPage.url(), '/login')
      await anonymous.close()
      const context = await browser.newContext()
      await context.loginAs(owner)
      const page = await context.newPage()
      for (const path of [
        '/admin',
        '/admin/users',
        `/admin/users/${admin.id}`,
        '/admin/playlists',
        `/admin/playlists/${playlist.id}`,
        '/admin/editorial',
      ]) {
        const response = await page.goto(`${base}${path}`)
        assert.equal(response!.status(), 403, path)
      }
      await page.goto(base)
      const payload = await new AdminManagement().playlist(admin, playlist.id)
      const write = await context.request.post(`${base}/admin/playlists/${playlist.id}`, {
        headers: await csrf(context),
        data: { ...payload, title: 'Forbidden' },
        maxRedirects: 0,
      })
      assert.equal(write.status(), 403)
      const untouched = await Playlist.findOrFail(playlist.id)
      assert.equal(untouched.title, playlist.title)
      await context.close()
    })
    test('administrator previews approved private media from another owner while unpublished draft media stays protected', async ({
      browserContext,
      browser,
      assert,
    }) => {
      const mediaId = randomUUID()
      await mkdir(app.tmpPath('editorial'), { recursive: true })
      await writeFile(
        app.tmpPath('editorial', `${mediaId}.png`),
        await sharp({ create: { width: 120, height: 120, channels: 3, background: '#caff38' } })
          .png()
          .toBuffer()
      )
      await db.table('editorial_media').insert({
        id: mediaId,
        user_id: owner.id,
        path: `${mediaId}.png`,
        width: 120,
        height: 120,
        provenance: JSON.stringify({
          credit: 'Test',
          license: 'CC0',
          url: 'https://example.com/image.png',
          license_url: 'https://example.com/license',
        }),
        created_at: new Date(),
      })
      const proposalId = randomUUID()
      await db.table('editorial_proposals').insert({
        id: proposalId,
        user_id: owner.id,
        status: 'draft',
        revision: 1,
        content: JSON.stringify({ items: [{ media_id: mediaId }] }),
        created_at: new Date(),
        updated_at: new Date(),
      })
      await db
        .from('playlist_items')
        .where('playlist_id', playlist.id)
        .update({ image_url: `/editorial/media/${mediaId}` })
      await browserContext.loginAs(admin)
      const page = await browserContext.newPage()
      await page.goto(`${base}/admin`)
      const draft = await browserContext.request.get(`${base}/editorial/media/${mediaId}`)
      assert.equal(draft.status(), 404)
      await db
        .from('editorial_proposals')
        .where('id', proposalId)
        .update({ status: 'published', playlist_id: playlist.id })
      const approved = await browserContext.request.get(`${base}/editorial/media/${mediaId}`)
      assert.equal(approved.status(), 200)
      const anonymous = await browser.newContext()
      const hidden = await anonymous.request.get(`${base}/editorial/media/${mediaId}`)
      assert.equal(hidden.status(), 404)
      await anonymous.close()
    })
  })
}
