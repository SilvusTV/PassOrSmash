import { test } from '@japa/runner'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import Proposals from '#services/editorial/proposals'
import { contentSchema, scopes, type Actor } from '#services/editorial/contracts'

const base = 'http://localhost:3333'
if (process.env.EDITORIAL_DB_TESTS === '1') {
  test.group('Simple editorial workflow', (group) => {
    let user: User
    let actor: Actor
    const service = new Proposals()
    group.each.setup(async () => {
      if (env.get('DB_DATABASE') !== 'passorsmash_editorial_test')
        throw new Error('Dedicated disposable database required.')
      await db.rawQuery('TRUNCATE users, editorial_settings RESTART IDENTITY CASCADE')
      user = await User.create({
        email: 'studio-workflow@example.com',
        password: 'test-password',
        discordId: 'studio-workflow-admin',
      })
      env.set('EDITORIAL_ADMIN_DISCORD_IDS', user.discordId!)
      actor = { userId: user.id, identity: `dashboard:${user.id}`, scopes: [...scopes] }
    })
    test('creates, edits images inline, publishes without review, withdraws and republishes on mobile', async ({
      browserContext,
      assert,
    }) => {
      await browserContext.loginAs(user)
      const page = await browserContext.visit(`${base}/admin/editorial`)
      page.setDefaultTimeout(12000)
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      assert.isFalse(
        await page
          .getByText('Une option pour préparer des brouillons depuis l’actualité.')
          .isVisible()
      )
      await page.getByRole('button', { name: '+ Nouvelle sélection', exact: true }).click()
      await page.getByLabel('Titre', { exact: true }).fill('Une sélection toute simple')
      await page
        .getByLabel('Description (facultative)', { exact: true })
        .fill('Deux images, aucun dossier à remplir.')
      for (let index = 1; index <= 2; index++) {
        await page.getByRole('button', { name: '+ Ajouter un élément', exact: true }).click()
        await page
          .getByLabel(`Titre de l’élément ${index}`, { exact: true })
          .fill(`Élément ${index}`)
      }
      const imageBytes = await sharp({
        create: { width: 160, height: 160, channels: 3, background: '#caff38' },
      })
        .png()
        .toBuffer()
      const imageUrl = 'https://example.com/direct.png'
      await page.route(imageUrl, (route) =>
        route.fulfill({ body: imageBytes, contentType: 'image/png' })
      )
      await page.getByLabel('Lien de l’image 1', { exact: true }).fill(imageUrl)
      await page
        .getByLabel('Importer une image pour l’élément 2', { exact: true })
        .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: imageBytes })
      await page.getByLabel('Crédit 2 (facultatif)', { exact: true }).fill('Photo test')
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await page.getByText('Tout est enregistré', { exact: true }).waitFor()
      const proposalId = page.url().split('/').at(-1)!
      let saved = await service.get(actor, proposalId)
      assert.equal(saved.content.items[0].image_url, imageUrl)
      assert.equal(saved.content.items[0].image_credit, '')
      assert.isString(saved.content.items[1].media_id)
      assert.lengthOf(await db.from('editorial_jobs'), 0)
      assert.equal(
        await page.locator('.edito-item-picture img').first().getAttribute('src'),
        imageUrl
      )
      await page.screenshot({ path: 'tmp/edito-simple-desktop.png', fullPage: true })
      await page.getByRole('button', { name: 'Aperçu', exact: true }).click()
      await page.getByRole('heading', { name: 'Aperçu', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Fermer l’aperçu', exact: true }).click()
      await page.getByRole('button', { name: 'Publier', exact: true }).click()
      await page.getByText('En ligne', { exact: true }).waitFor()
      saved = await service.get(actor, proposalId)
      const publicUrl = saved.public_url
      assert.equal(saved.status, 'published')
      const publishedItems = await db
        .from('playlist_items')
        .where('playlist_id', saved.playlist_id)
        .orderBy('position')
      await db.from('playlist_items').where('id', publishedItems[0].id).update({ smashes: 7 })
      const response = await browserContext.request.get(`${base}${publicUrl}`)
      assert.equal(response.status(), 200)
      assert.include(await response.text(), imageUrl)
      await page.getByLabel('Titre', { exact: true }).fill('Version en ligne modifiée')
      await page.getByRole('button', { name: 'Mettre à jour', exact: true }).click()
      await page.getByRole('heading', { name: 'Version en ligne modifiée', exact: true }).waitFor()
      const online = await service.get(actor, proposalId)
      assert.equal(online.status, 'published')
      assert.equal(online.public_url, publicUrl)
      await page.getByRole('button', { name: 'Retirer du site', exact: true }).click()
      await page.getByRole('button', { name: 'Publier', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Descendre l’élément 1', exact: true }).click()
      await page.getByLabel('Titre', { exact: true }).fill('Version modifiée')
      await page.setViewportSize({ width: 390, height: 844 })
      assert.isTrue(
        await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
      )
      await page.screenshot({ path: 'tmp/edito-simple-mobile.png', fullPage: true })
      await page.getByRole('button', { name: 'Publier', exact: true }).click()
      await page.getByText('En ligne', { exact: true }).waitFor()
      saved = await service.get(actor, proposalId)
      assert.equal(saved.public_url, publicUrl)
      const republished = await db
        .from('playlist_items')
        .where('playlist_id', saved.playlist_id)
        .orderBy('position')
      assert.deepEqual(
        republished.map((item) => item.id),
        publishedItems.map((item) => item.id).reverse()
      )
      assert.equal(republished[1].smashes, 7)
      await page.getByRole('button', { name: 'Retirer du site', exact: true }).click()
      await page.getByRole('button', { name: 'Supprimer la sélection', exact: true }).waitFor()
      page.once('dialog', (dialog) => dialog.accept())
      await page.getByRole('button', { name: 'Supprimer la sélection', exact: true }).click()
      await page.getByRole('heading', { name: 'Édito', exact: true }).waitFor()
      assert.isNull(await db.from('editorial_proposals').where('id', proposalId).first())
      assert.deepEqual(errors, [])
    })
    test('keeps unsaved text after an MCP edit conflict and exposes settings without crowding the list', async ({
      browserContext,
      assert,
    }) => {
      const created = await service.create(
        actor,
        contentSchema.parse({ title: 'Brouillon à modifier' }),
        randomUUID()
      )
      await browserContext.loginAs(user)
      const page = await browserContext.visit(
        `${base}/admin/editorial/proposals/${created.proposal_id}`
      )
      await page.getByLabel('Description (facultative)', { exact: true }).fill('Texte à conserver.')
      await service.mutate(actor, created.proposal_id, 1, 'mcp-edit', (content) => ({
        ...content,
        category: 'jeux',
      }))
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await page
        .getByText('La proposition a changé. Rechargez son aperçu.', { exact: true })
        .waitFor()
      await page.screenshot({ path: 'tmp/edito-conflict-debug.png', fullPage: true })
      assert.equal(
        await page.getByLabel('Description (facultative)', { exact: true }).inputValue(),
        'Texte à conserver.'
      )
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await page.getByText('Tout est enregistré', { exact: true }).waitFor()
      const saved = await service.get(actor, created.proposal_id)
      assert.equal(saved.content.description, 'Texte à conserver.')
      await page.getByRole('link', { name: '← Toutes les sélections', exact: true }).click()
      await page.getByLabel('Rechercher', { exact: true }).fill('introuvable')
      await page.getByText('Aucune sélection trouvée.', { exact: true }).waitFor()
      await page.getByText('Préparation automatique', { exact: true }).click()
      await page.getByText('Réglages de l’automatisation', { exact: true }).click()
      await page.getByText('Budget et options', { exact: true }).click()
      await page
        .getByLabel('Catégories (séparées par des virgules)', { exact: true })
        .fill('cinéma, science fiction')
      await page.getByRole('button', { name: 'Enregistrer les réglages', exact: true }).click()
      await page.getByText('Action éditoriale enregistrée.', { exact: true }).waitFor()
      const settings = await db.from('editorial_settings').where('id', 1).first()
      assert.deepEqual(settings.settings.categories, ['cinéma', 'science fiction'])
      await page.setViewportSize({ width: 390, height: 844 })
      assert.isTrue(
        await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
      )
    })
  })
}
