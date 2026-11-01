import { test } from '@japa/runner'
import env from '#start/env'
import User from '#models/user'
import { randomUUID } from 'node:crypto'
import Proposals from '#services/editorial/proposals'
import { contentSchema, scopes } from '#services/editorial/contracts'

if (process.env.EDITORIAL_DB_TESTS === '1') {
  test.group('Editorial dashboard browser', () => {
    test('administrator edits a private draft on desktop and mobile; ordinary user is forbidden', async ({
      browser,
      assert,
    }) => {
      if (env.get('DB_DATABASE') !== 'passorsmash_editorial_test')
        throw new Error('Dedicated test database required.')
      const uid = randomUUID()
      const user = await User.create({
        email: `${uid}@example.com`,
        password: 'test-password',
        discordId: `admin-${uid}`,
      })
      env.set('EDITORIAL_ADMIN_DISCORD_IDS', `admin-${uid}`)
      const proposal = await new Proposals().create(
        { userId: user.id, identity: `dashboard:${user.id}`, scopes: [...scopes] },
        contentSchema.parse({
          title: 'Sélection de démonstration',
          description: 'Une proposition privée à préparer.',
          category: 'jeux',
        }),
        randomUUID()
      )
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
      await context.loginAs(user)
      const page = await context.visit('/admin/editorial')
      await page.getByRole('heading', { name: 'Studio éditorial.' }).waitFor()
      await page.screenshot({ path: 'tmp/editorial-admin-desktop.png', fullPage: true })
      await page.getByRole('link', { name: 'Sélection de démonstration' }).click()
      await page.getByLabel('Titre', { exact: true }).fill('Sélection modifiée')
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await page.getByRole('heading', { name: 'Sélection modifiée', exact: true }).first().waitFor()
      const saved = await new Proposals().get(
        { userId: user.id, identity: `dashboard:${user.id}`, scopes: [...scopes] },
        proposal.proposal_id
      )
      assert.equal(saved.revision, 2)
      assert.isTrue(await page.getByRole('button', { name: 'Soumettre pour examen' }).isDisabled())
      await page.setViewportSize({ width: 390, height: 844 })
      await page.screenshot({ path: 'tmp/editorial-proposal-mobile.png', fullPage: true })
      assert.isTrue(
        await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
      )
      await context.close()
      const ordinary = await User.create({
        email: `ordinary-${uid}@example.com`,
        password: 'test-password',
        discordId: `ordinary-${uid}`,
      })
      const deniedContext = await browser.newContext()
      await deniedContext.loginAs(ordinary)
      const denied = await deniedContext.request.get('http://localhost:3333/admin/editorial')
      assert.equal(denied.status(), 403)
      await deniedContext.close()
    })
  })
}
