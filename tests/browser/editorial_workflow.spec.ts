import { test } from '@japa/runner'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import Proposals from '#services/editorial/proposals'
import EditorialJobs from '#services/editorial/jobs'
import { contentSchema, scopes, EditorialError, type Actor } from '#services/editorial/contracts'

const base = 'http://localhost:3333'
if (process.env.EDITORIAL_DB_TESTS === '1') {
  test.group('Editorial complete workflow', (group) => {
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

    test('creates a draft, filters selections and saves readable settings across every mobile tab', async ({
      browserContext,
      assert,
    }) => {
      await browserContext.loginAs(user)
      const page = await browserContext.visit(`${base}/admin/editorial`)
      page.setDefaultTimeout(10000)
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.getByRole('button', { name: /créer un brouillon/i }).click()
      await page.getByLabel('Titre', { exact: true }).waitFor()
      assert.match(page.url(), /\/proposals\/[a-f0-9-]+$/)
      await page.getByLabel('Titre', { exact: true }).fill('Une nouvelle sélection')
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await page.getByRole('heading', { name: 'Une nouvelle sélection', exact: true }).waitFor()
      await page.getByRole('link', { name: '← Studio éditorial', exact: true }).click()
      await page.getByLabel('Rechercher une sélection').fill('introuvable')
      await page.getByText('Aucun résultat.', { exact: true }).waitFor()
      await page.getByLabel('Rechercher une sélection').fill('nouvelle')
      await page.getByRole('link', { name: 'Une nouvelle sélection', exact: true }).waitFor()
      await page.getByLabel('Statut', { exact: true }).selectOption('published')
      await page.getByText('Aucun résultat.', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Planification', exact: true }).click()
      const categories = page.getByLabel('Catégories (séparées par des virgules)')
      await categories.fill('cinéma, science fiction')
      assert.equal(await categories.inputValue(), 'cinéma, science fiction')
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' && response.url().endsWith('/settings')
        ),
        page.getByRole('button', { name: 'Enregistrer les réglages' }).click(),
      ])
      const row = await db.from('editorial_settings').where('id', 1).first()
      assert.deepEqual(row.settings.categories, ['cinéma', 'science fiction'])
      await page.getByRole('button', { name: 'Sélections', exact: true }).click()
      assert.equal(
        await page.getByRole('combobox', { name: 'Catégorie', exact: true }).inputValue(),
        'cinéma'
      )
      await page.setViewportSize({ width: 390, height: 844 })
      for (const theme of ['light', 'dark']) {
        await page.evaluate(`document.documentElement.dataset.theme = '${theme}'`)
        for (const label of ['Sélections', 'Planification', 'Activité', 'Connexions MCP']) {
          await page
            .getByRole('navigation', { name: 'Sections du studio' })
            .getByRole('button', { name: label, exact: true })
            .click()
          assert.isTrue(
            await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),
            `${theme}: ${label}`
          )
        }
        await page.screenshot({
          path: `tmp/studio-connections-${theme}-mobile.png`,
          fullPage: true,
        })
      }
      assert.deepEqual(errors, [])
    })

    test('edits multiline sources, queues both images, refreshes their progress, previews, reviews and publishes', async ({
      browserContext,
      assert,
    }) => {
      const urls = ['https://example.com/news', 'https://example.com/official']
      const created = await service.create(
        actor,
        contentSchema.parse({
          title: 'Sélection complète',
          category: 'jeux',
          items: [1, 2].map((i) => ({ title: `Jeu ${i}`, source_urls: [urls[0]] })),
          sources: urls.map((url) => ({
            title: 'Annonce officielle',
            url,
            retrieved_at: new Date().toISOString(),
          })),
        }),
        randomUUID()
      )
      const mediaId = randomUUID()
      const provenance = {
        url: 'https://example.com/photo.png',
        credit: 'Photo de test',
        license: 'CC0' as const,
        license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
      }
      await mkdir(app.tmpPath('editorial'), { recursive: true })
      await writeFile(
        app.tmpPath('editorial', `${mediaId}.png`),
        await sharp({ create: { width: 160, height: 160, channels: 3, background: '#caff38' } })
          .png()
          .toBuffer()
      )
      await db.table('editorial_media').insert({
        id: mediaId,
        user_id: user.id,
        path: `${mediaId}.png`,
        provenance: JSON.stringify(provenance),
        width: 160,
        height: 160,
        created_at: new Date(),
      })
      let imageCalls = 0
      const worker = new EditorialJobs({
        news: { find: async () => [] },
        generation: {
          generate: async () => {
            throw new Error('unexpected generation')
          },
        },
        media: {
          import: async () => {
            if (++imageCalls === 1)
              throw new EditorialError(
                'PROVIDER_UNAVAILABLE',
                'Serveur image temporairement indisponible.',
                false
              )
            return { media_id: mediaId, width: 160, height: 160, provenance }
          },
        },
      })
      await browserContext.loginAs(user)
      const page = await browserContext.visit(
        `${base}/admin/editorial/proposals/${created.proposal_id}`
      )
      page.setDefaultTimeout(12000)
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.getByRole('button', { name: 'Images & crédits', exact: true }).click()
      await page.getByRole('heading', { name: 'Images & crédits.', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Contenu', exact: true }).click()
      const sources = page.getByLabel('URLs des sources (une par ligne)').first()
      await sources.fill(`${urls.join('\n')}\n`)
      assert.equal(await sources.inputValue(), `${urls.join('\n')}\n`)
      await page.getByRole('button', { name: 'Descendre', exact: true }).first().click()
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await page.getByLabel('Titre de l’élément 1').waitFor()
      assert.equal(await page.getByLabel('Titre de l’élément 1').inputValue(), 'Jeu 2')
      // Saving remains available after switching away from a dirty content form.
      await page.getByLabel('Titre', { exact: true }).fill('Sélection finalisée')
      await page.getByRole('button', { name: 'Images & crédits' }).click()
      assert.isTrue(await page.getByRole('button', { name: 'Lancer l’import' }).isDisabled())
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await page.getByRole('heading', { name: 'Sélection finalisée', exact: true }).waitFor()
      await page
        .getByLabel('Description de la sélection', { exact: true })
        .first()
        .fill('Texte conservé après un conflit de version.')
      const concurrent = await service.get(actor, created.proposal_id)
      await service.mutate(
        actor,
        created.proposal_id,
        concurrent.revision,
        'update',
        (content) => ({ ...content, category: 'culture' })
      )
      await Promise.all([
        page.waitForResponse(
          (response) => response.request().method() === 'POST' && response.url().endsWith('/save')
        ),
        page.getByRole('button', { name: 'Enregistrer', exact: true }).click(),
      ])
      await page
        .getByText('La proposition a changé. Rechargez son aperçu.', { exact: true })
        .waitFor()
      assert.equal(
        await page.getByLabel('Description de la sélection', { exact: true }).first().inputValue(),
        'Texte conservé après un conflit de version.'
      )
      await Promise.all([
        page.waitForResponse(
          (response) => response.request().method() === 'POST' && response.url().endsWith('/save')
        ),
        page.getByRole('button', { name: 'Enregistrer', exact: true }).click(),
      ])
      await page.getByRole('button', { name: 'Images & crédits' }).click()
      const proposal = await service.get(actor, created.proposal_id)
      for (const item of proposal.content.items) {
        await page.getByRole('combobox', { name: /^Élément/ }).selectOption(item.id)
        await page.getByLabel('URL de l’image', { exact: true }).fill(provenance.url)
        await page.getByLabel('Crédit', { exact: true }).fill(provenance.credit)
        await page.getByLabel('Lien vers la licence ou l’autorisation').fill(provenance.license_url)
        await Promise.all([
          page.waitForResponse(
            (response) =>
              response.request().method() === 'POST' && response.url().endsWith('/import')
          ),
          page.getByRole('button', { name: 'Lancer l’import', exact: true }).click(),
        ])
        await page.getByText('En attente de traitement', { exact: false }).first().waitFor()
      }
      await Promise.all([worker.workOne(), worker.workOne()])
      await page.getByText('Import échoué', { exact: false }).waitFor()
      await page.getByText('Serveur image temporairement indisponible.', { exact: true }).waitFor()
      await Promise.all([
        page.waitForResponse(
          (response) => response.request().method() === 'POST' && response.url().endsWith('/retry')
        ),
        page.getByRole('button', { name: 'Réessayer l’import', exact: true }).click(),
      ])
      const retried = await db
        .from('editorial_jobs')
        .where('kind', 'image')
        .where('status', 'queued')
        .first()
      assert.isNull(retried.error)
      assert.equal(retried.attempts, 0)
      await worker.workOne()
      await page.getByText('Image importée', { exact: false }).nth(1).waitFor()
      await page
        .getByRole('button', { name: 'Soumettre pour examen', exact: true })
        .waitFor({ state: 'visible' })
      assert.isFalse(
        await page.getByRole('button', { name: 'Soumettre pour examen', exact: true }).isDisabled()
      )
      await page.screenshot({ path: 'tmp/studio-images-desktop.png', fullPage: true })
      await page.getByRole('button', { name: 'Aperçu du jeu' }).click()
      await page.getByRole('heading', { name: 'Aperçu du jeu', exact: true }).waitFor()
      assert.isTrue(
        await page
          .locator('.editorial-preview img')
          .evaluateAll((images) =>
            images.every((image) => (image as any).complete && (image as any).naturalWidth > 0)
          )
      )
      await page.setViewportSize({ width: 390, height: 844 })
      assert.isTrue(
        await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
      )
      await page.screenshot({ path: 'tmp/studio-preview-mobile.png', fullPage: true })
      await page.getByRole('button', { name: 'Soumettre pour examen', exact: true }).click()
      await page.getByRole('button', { name: /Approuver et publier la version/ }).waitFor()
      await page.getByRole('button', { name: 'Refuser', exact: true }).click()
      await page.getByRole('button', { name: 'Rouvrir pour modification', exact: true }).click()
      await page.getByRole('button', { name: 'Soumettre pour examen', exact: true }).click()
      await page.getByRole('button', { name: /Approuver et publier la version/ }).click()
      await page.getByText('Publiée', { exact: true }).waitFor()
      const published = await service.get(actor, created.proposal_id)
      assert.equal(published.status, 'published')
      assert.isNumber(published.playlist_id)
      const playlist = await db.from('playlists').where('id', published.playlist_id).first()
      const publicPage = await browserContext.request.get(`${base}/p/${playlist.slug}`)
      assert.equal(publicPage.status(), 200)
      assert.deepEqual(errors, [])
    })
  })
}
