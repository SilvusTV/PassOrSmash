import { test } from '@japa/runner'
import env from '#start/env'
import User from '#models/user'
import { randomUUID } from 'node:crypto'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import type { BrowserContext } from 'playwright'

const base = 'http://localhost:3333'
if (process.env.EDITORIAL_DB_TESTS === '1') {
  test.group('Account sign-in', (group) => {
    group.setup(() => {
      if (env.get('DB_DATABASE') !== 'passorsmash_editorial_test')
        throw new Error('Dedicated test database required')
    })
    test('email signup, logout, wrong password and subsequent login work through the forms', async ({
      browserContext,
      assert,
    }) => {
      const email = `signup-${randomUUID()}@example.com`
      const page = await browserContext.newPage()
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`${base}/signup`)
      await page.screenshot({ path: 'tmp/signup-mobile.png', fullPage: true })
      await page.getByLabel('Nom affiché').fill('Compte de recette')
      await page.getByLabel('Adresse e-mail').fill(email)
      await page.getByLabel('Mot de passe', { exact: true }).fill('test-password-123')
      await page.getByLabel('Confirmer le mot de passe').fill('test-password-123')
      await page.getByRole('button', { name: 'Créer mon compte' }).click()
      await page.getByRole('button', { name: 'Mon compte', exact: true }).waitFor()
      const user = await User.findByOrFail('email', email)
      assert.notEqual(user.password, 'test-password-123')
      await page.getByRole('button', { name: 'Mon compte', exact: true }).click()
      await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click()
      await page.goto(`${base}/login`)
      await page.getByLabel('Adresse e-mail').fill(email)
      await page.getByLabel('Mot de passe', { exact: true }).fill('wrong-password')
      await page.getByRole('button', { name: 'Se connecter par e-mail' }).click()
      await page.getByRole('alert').first().waitFor()
      await page.getByLabel('Mot de passe', { exact: true }).fill('test-password-123')
      await page.getByRole('button', { name: 'Se connecter par e-mail' }).click()
      await page.getByRole('button', { name: 'Mon compte', exact: true }).waitFor()
      await page.goto(`${base}/profile`)
      await page.getByText(email, { exact: true }).waitFor()
    })
    test('Google validates signed identity and state, rejects email collisions, and links only while authenticated', async ({
      browser,
      assert,
    }) => {
      const originalFetch = globalThis.fetch
      const previousId = env.get('GOOGLE_CLIENT_ID')
      const previousSecret = env.get('GOOGLE_CLIENT_SECRET')
      env.set('GOOGLE_CLIENT_ID', 'test-google-client')
      env.set('GOOGLE_CLIENT_SECRET', 'test-google-secret')
      const { privateKey, publicKey } = await generateKeyPair('RS256')
      const jwk = {
        ...(await exportJWK(publicKey)),
        kid: 'google-test-key',
        alg: 'RS256',
        use: 'sig',
      }
      let token = ''
      globalThis.fetch = async (input, init) => {
        const url = input instanceof Request ? input.url : String(input)
        if (url === 'https://oauth2.googleapis.com/token') return Response.json({ id_token: token })
        if (url === 'https://www.googleapis.com/oauth2/v3/certs')
          return Response.json({ keys: [jwk] })
        return originalFetch(input, init)
      }
      const context = await browser.newContext()
      const email = `google-${randomUUID()}@example.com`
      const subject = randomUUID()
      async function begin(current: BrowserContext, sub: string, mail: string, verified = true) {
        const redirect = await current.request.get(`${base}/auth/google`, { maxRedirects: 0 })
        const url = new URL(redirect.headers().location)
        token = await new SignJWT({
          email: mail,
          email_verified: verified,
          nonce: url.searchParams.get('nonce'),
          name: 'Google de recette',
        })
          .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
          .setSubject(sub)
          .setIssuer('https://accounts.google.com')
          .setAudience('test-google-client')
          .setIssuedAt()
          .setExpirationTime('5m')
          .sign(privateKey)
        return `${base}/auth/google/callback?code=simulated&state=${url.searchParams.get('state')}`
      }
      try {
        const callback = await begin(context, subject, email)
        const forged = await context.request.get(`${callback}wrong`, { maxRedirects: 0 })
        assert.equal(forged.headers().location, '/login')
        assert.isNull(await User.findBy('googleId', subject))
        const invalid = await begin(context, subject, email, false)
        await context.request.get(invalid)
        assert.isNull(await User.findBy('googleId', subject))
        const valid = await begin(context, subject, email)
        const signedIn = await context.request.get(valid, { maxRedirects: 0 })
        assert.equal(signedIn.headers().location, '/dashboard')
        const user = await User.findByOrFail('googleId', subject)
        assert.equal(user.email, email)
        const collisionContext = await browser.newContext()
        try {
          const collision = await begin(collisionContext, `${subject}-other`, email)
          const denied = await collisionContext.request.get(collision, { maxRedirects: 0 })
          assert.equal(denied.headers().location, '/login')
          assert.isNull(await User.findBy('googleId', `${subject}-other`))
        } finally {
          await collisionContext.close()
        }
        const owner = await User.create({
          email: `existing-${randomUUID()}@example.com`,
          password: 'test-password',
          discordId: `existing-${randomUUID().slice(0, 16)}`,
        })
        const linkedContext = await browser.newContext()
        try {
          await linkedContext.loginAs(owner)
          const linkedPage = await linkedContext.newPage()
          await linkedPage.goto(`${base}/profile`)
          const linkSubject = randomUUID()
          const link = await begin(linkedContext, linkSubject, owner.email)
          const linked = await linkedContext.request.get(link, { maxRedirects: 0 })
          assert.equal(linked.headers().location, '/profile')
          const updated = await User.findOrFail(owner.id)
          assert.equal(updated.googleId, linkSubject)
          assert.equal(updated.discordId, owner.discordId)
        } finally {
          await linkedContext.close()
        }
      } finally {
        globalThis.fetch = originalFetch
        env.set('GOOGLE_CLIENT_ID', previousId)
        env.set('GOOGLE_CLIENT_SECRET', previousSecret)
        await context.close()
      }
    })
  })
}
