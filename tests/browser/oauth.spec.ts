import { test } from '@japa/runner'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { createHash, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { BrowserContext } from 'playwright'
import OAuthAdapter from '#services/oauth/adapter'
import { oauthIssuer, oauthResource, verifyLocalAccessToken } from '#services/oauth/provider'
import { authorizeMcpClaims } from '#services/editorial/mcp_access'
import encryption from '@adonisjs/core/services/encryption'
import { importJWK, SignJWT, type JSONWebKeySet } from 'jose'

const base = 'http://localhost:3333'
let callback: string
const verifier = 'a'.repeat(64)
const challenge = createHash('sha256').update(verifier).digest('base64url')

if (process.env.EDITORIAL_DB_TESTS === '1') {
  test.group('Discord MCP OAuth', (group) => {
    let user: User
    group.setup(async () => {
      const server = createServer((_request, response) => {
        response.writeHead(200, {
          'content-type': 'text/plain',
          'cache-control': 'no-store',
          'connection': 'close',
        })
        response.end('OAuth callback received')
      })
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
      callback = `http://127.0.0.1:${(server.address() as AddressInfo).port}/callback`
      return () =>
        new Promise<void>((resolve, reject) => {
          server.closeAllConnections()
          server.close((error) => (error ? reject(error) : resolve()))
        })
    })
    group.each.setup(async () => {
      if (env.get('DB_DATABASE') !== 'passorsmash_editorial_test')
        throw new Error('Dedicated test database required.')
      env.set('MCP_OAUTH_ISSUER', '')
      env.set('MCP_OAUTH_JWKS_URL', '')
      const uid = randomUUID()
      user = await User.create({
        email: `${uid}@example.com`,
        password: 'test-password',
        fullName: 'Administrateur de recette',
        discordId: `oauth-${uid.slice(0, 20)}`,
      })
      env.set('EDITORIAL_ADMIN_DISCORD_IDS', user.discordId!)
      await db.from('mcp_oauth_rate_limits').delete()
    })
    async function register(context: BrowserContext) {
      const response = await context.request.post(`${base}/oauth/register`, {
        data: {
          client_name: 'Client de recette',
          redirect_uris: [callback],
          token_endpoint_auth_method: 'none',
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
        },
      })
      if (response.status() !== 201)
        throw new Error(`Registration failed: ${response.status()} ${await response.text()}`)
      const registered = await response.json()
      return String(registered.client_id)
    }
    function authorization(clientId: string, overrides = {}) {
      return `${base}/oauth/authorize?${new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: callback, resource: oauthResource(), scope: 'editorial:read editorial:write editorial:generate', code_challenge: challenge, code_challenge_method: 'S256', state: 'test-state', ...overrides })}`
    }
    async function approve(
      context: BrowserContext,
      clientId: string,
      decision = 'Autoriser la connexion',
      existingConnection = false
    ) {
      await context.loginAs(user)
      const page = await context.newPage()
      page.setDefaultTimeout(10000)
      page.setDefaultNavigationTimeout(10000)
      const responses: string[] = []
      page.on('requestfailed', (request) =>
        responses.push(`FAILED ${new URL(request.url()).pathname} ${request.failure()?.errorText}`)
      )
      page.on('response', (response) => {
        if (response.url().startsWith(base))
          responses.push(
            `${response.status()} ${response.request().resourceType()} ${new URL(response.url()).pathname}${response.headers().location ? ' => ' + new URL(response.headers().location, base).origin + new URL(response.headers().location, base).pathname : ''}`
          )
      })
      await page.goto(authorization(clientId))
      await page.getByRole('heading', { name: 'Autoriser Client de recette ?' }).waitFor()
      const before = await db
        .from('editorial_connections')
        .where({ user_id: user.id, client_id: clientId })
        .first()
      if (before && !existingConnection)
        throw new Error('Consent must not create a connection before acceptance')
      await page.screenshot({ path: 'tmp/oauth-consent-desktop.png', fullPage: true })
      await page.setViewportSize({ width: 390, height: 844 })
      await page.screenshot({ path: 'tmp/oauth-consent-mobile.png', fullPage: true })
      await page.getByRole('button', { name: decision, exact: true }).click({ noWaitAfter: true })
      try {
        await page.waitForURL(
          (url) => url.origin === new URL(callback).origin && url.pathname === '/callback',
          { timeout: 5000 }
        )
      } catch {
        const body = await page.locator('body').innerText()
        throw new Error(
          `OAuth return failed: ${responses.join(' -> ')} at ${new URL(page.url()).pathname}: ${body.slice(0, 800)}`
        )
      }
      return { page, result: new URL(page.url()) }
    }
    async function exchange(
      context: BrowserContext,
      clientId: string,
      code: string,
      codeVerifier = verifier
    ) {
      return context.request.post(`${base}/oauth/token`, {
        form: {
          grant_type: 'authorization_code',
          client_id: clientId,
          code,
          redirect_uri: callback,
          code_verifier: codeVerifier,
          resource: oauthResource(),
        },
      })
    }
    async function mcp(context: BrowserContext, accessToken?: string) {
      return context.request.post(`${base}/mcp`, {
        headers: {
          'accept': 'application/json, text/event-stream',
          'mcp-protocol-version': '2025-11-25',
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        data: { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
      })
    }
    test('discovers OAuth and public keys without credentials; challenges unauthenticated MCP', async ({
      browserContext,
      assert,
    }) => {
      const resource = await browserContext.request.get(
        `${base}/.well-known/oauth-protected-resource/mcp`
      )
      assert.equal(resource.status(), 200)
      const metadata = await resource.json()
      assert.deepEqual(metadata.authorization_servers, [oauthIssuer()])
      const discovery = await browserContext.request.get(
        `${base}/.well-known/oauth-authorization-server`
      )
      const discovered = await discovery.json()
      assert.equal(discovered.authorization_response_iss_parameter_supported, true)
      const keys = await browserContext.request.get(`${base}/oauth/jwks`)
      const jwks = await keys.json()
      assert.isTrue(jwks.keys.length > 0)
      assert.isUndefined(jwks.keys[0].d)
      const denied = await mcp(browserContext)
      assert.equal(denied.status(), 401)
      assert.include(denied.headers()['www-authenticate'], 'resource_metadata')
    })
    test('consents, exchanges PKCE code, lists 19 tools, rotates refresh and revokes access', async ({
      browserContext,
      assert,
    }) => {
      const clientId = await register(browserContext)
      const { result, page } = await approve(browserContext, clientId)
      assert.equal(result.searchParams.get('state'), 'test-state')
      assert.equal(result.searchParams.get('iss'), oauthIssuer())
      const code = result.searchParams.get('code')!
      const response = await exchange(browserContext, clientId, code)
      assert.equal(response.status(), 200, await response.text())
      const tokens = await response.json()
      assert.isString(tokens.refresh_token)
      const payload = await verifyLocalAccessToken(tokens.access_token)
      const actor = await authorizeMcpClaims(payload)
      assert.equal(actor.userId, user.id)
      const toolsResponse = await mcp(browserContext, tokens.access_token)
      assert.equal(toolsResponse.status(), 200)
      const raw = await toolsResponse.text()
      const tools = JSON.parse(
        raw.startsWith('event:') ? raw.split('data: ')[1].split('\n')[0] : raw
      ).result.tools
      assert.lengthOf(tools, 19)
      assert.isFalse(tools.some((tool: { name: string }) => /publish|approve/.test(tool.name)))
      const second = await browserContext.request.post(`${base}/oauth/token`, {
        form: {
          grant_type: 'refresh_token',
          client_id: clientId,
          refresh_token: tokens.refresh_token,
          resource: oauthResource(),
        },
      })
      assert.equal(second.status(), 200, await second.text())
      const refreshed = await second.json()
      assert.notEqual(refreshed.refresh_token, tokens.refresh_token)
      const active = await mcp(browserContext, refreshed.access_token)
      assert.equal(active.status(), 200)
      await page.goto(`${base}/admin/editorial`)
      await page.getByRole('button', { name: 'Révoquer', exact: true }).click()
      await page.getByText('Révoquée', { exact: true }).waitFor()
      const revoked = await mcp(browserContext, refreshed.access_token)
      assert.equal(revoked.status(), 401)
      const refreshRevoked = await browserContext.request.post(`${base}/oauth/token`, {
        form: {
          grant_type: 'refresh_token',
          client_id: clientId,
          refresh_token: refreshed.refresh_token,
          resource: oauthResource(),
        },
      })
      assert.equal(refreshRevoked.status(), 400)
      const reused = await exchange(browserContext, clientId, code)
      assert.equal(reused.status(), 400)
    })
    test('refusal returns access_denied and never creates a connection', async ({
      browserContext,
      assert,
    }) => {
      const clientId = await register(browserContext)
      const { result } = await approve(browserContext, clientId, 'Refuser')
      assert.equal(result.searchParams.get('error'), 'access_denied')
      assert.equal(result.searchParams.get('iss'), oauthIssuer())
      assert.isNull(result.searchParams.get('code'))
      assert.isNull(
        await db
          .from('editorial_connections')
          .where({ user_id: user.id, client_id: clientId })
          .first()
      )
    })
    test('new consent replaces the grant without reviving old access; refresh revocation takes effect immediately', async ({
      browserContext,
      assert,
    }) => {
      const clientId = await register(browserContext)
      const first = await approve(browserContext, clientId)
      const firstResponse = await exchange(
        browserContext,
        clientId,
        first.result.searchParams.get('code')!
      )
      const firstTokens = await firstResponse.json()
      const firstAccess = await mcp(browserContext, firstTokens.access_token)
      assert.equal(firstAccess.status(), 200)
      const second = await approve(browserContext, clientId, 'Autoriser la connexion', true)
      const secondResponse = await exchange(
        browserContext,
        clientId,
        second.result.searchParams.get('code')!
      )
      const secondTokens = await secondResponse.json()
      const oldAccess = await mcp(browserContext, firstTokens.access_token)
      assert.equal(oldAccess.status(), 401)
      const freshAccess = await mcp(browserContext, secondTokens.access_token)
      assert.equal(freshAccess.status(), 200)
      const otherClient = await register(browserContext)
      const forbiddenRevocation = await browserContext.request.post(`${base}/oauth/revoke`, {
        form: {
          client_id: otherClient,
          token: secondTokens.refresh_token,
          token_type_hint: 'refresh_token',
        },
      })
      assert.equal(forbiddenRevocation.status(), 200)
      const stillActive = await mcp(browserContext, secondTokens.access_token)
      assert.equal(stillActive.status(), 200)
      const revoked = await browserContext.request.post(`${base}/oauth/revoke`, {
        form: {
          client_id: clientId,
          token: secondTokens.refresh_token,
          token_type_hint: 'refresh_token',
        },
      })
      assert.equal(revoked.status(), 200)
      const afterRevocation = await mcp(browserContext, secondTokens.access_token)
      assert.equal(afterRevocation.status(), 401)
    })
    test('rejects expired JWTs, wrong audience and concurrent authorization-code replay', async ({
      browserContext,
      assert,
    }) => {
      const clientId = await register(browserContext)
      const { result } = await approve(browserContext, clientId)
      const response = await exchange(browserContext, clientId, result.searchParams.get('code')!)
      const tokens = await response.json()
      const payload = await verifyLocalAccessToken(tokens.access_token)
      const row = await db.from('mcp_oauth_keys').where('id', 1).first()
      const privateJwk = encryption.decrypt<JSONWebKeySet>(row.jwks)!.keys[0]
      const signingKey = await importJWK(privateJwk, 'RS256')
      const expired = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt', kid: privateJwk.kid })
        .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
        .sign(signingKey)
      const wrongAudience = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt', kid: privateJwk.kid })
        .setAudience('https://other.example/mcp')
        .sign(signingKey)
      const expiredResponse = await mcp(browserContext, expired)
      const wrongAudienceResponse = await mcp(browserContext, wrongAudience)
      assert.equal(expiredResponse.status(), 401)
      assert.equal(wrongAudienceResponse.status(), 401)
      const replacement = await approve(browserContext, clientId, 'Autoriser la connexion', true)
      const code = replacement.result.searchParams.get('code')!
      const exchanges = await Promise.all([
        exchange(browserContext, clientId, code),
        exchange(browserContext, clientId, code),
      ])
      assert.deepEqual(
        exchanges.map((exchangeResult) => exchangeResult.status()).sort(),
        [200, 400]
      )
    })
    test('refresh-token replay is refused and revokes its authorization grant', async ({
      browserContext,
      assert,
    }) => {
      const clientId = await register(browserContext)
      const { result } = await approve(browserContext, clientId)
      const response = await exchange(browserContext, clientId, result.searchParams.get('code')!)
      const tokens = await response.json()
      const request = {
        form: {
          grant_type: 'refresh_token',
          client_id: clientId,
          refresh_token: tokens.refresh_token,
          resource: oauthResource(),
        },
      }
      const refreshedResponse = await browserContext.request.post(`${base}/oauth/token`, request)
      assert.equal(refreshedResponse.status(), 200)
      const refreshed = await refreshedResponse.json()
      const replay = await browserContext.request.post(`${base}/oauth/token`, request)
      assert.equal(replay.status(), 400)
      const revoked = await mcp(browserContext, refreshed.access_token)
      assert.equal(revoked.status(), 401)
    })
    test('rejects a Discord callback without a pending state and an expired MCP interaction', async ({
      browserContext,
      assert,
    }) => {
      const callbackResponse = await browserContext.request.get(
        `${base}/auth/discord/callback?code=not-a-real-code`,
        { maxRedirects: 0 }
      )
      assert.equal(callbackResponse.status(), 302)
      assert.include(callbackResponse.headers().location, '/auth/error')
      const expiredInteraction = await browserContext.request.get(
        `${base}/oauth/interaction/${randomUUID()}`
      )
      assert.equal(expiredInteraction.status(), 400)
    })
    test('rejects wrong PKCE verifier, redirect tampering, missing PKCE and unsafe registration', async ({
      browserContext,
      assert,
    }) => {
      const clientId = await register(browserContext)
      const unsafe = await browserContext.request.post(`${base}/oauth/register`, {
        data: {
          redirect_uris: ['https://user:secret@example.com/cb'],
          token_endpoint_auth_method: 'none',
        },
      })
      assert.equal(unsafe.status(), 400)
      const tampered = await browserContext.request.get(
        authorization(clientId, { redirect_uri: 'https://attacker.example/callback' }),
        { maxRedirects: 0 }
      )
      assert.equal(tampered.status(), 400)
      const noPkce = await browserContext.request.get(
        authorization(clientId, { code_challenge: '', code_challenge_method: '' }),
        { maxRedirects: 0 }
      )
      assert.notEqual(noPkce.headers().location, undefined)
      assert.include(noPkce.headers().location, 'error=invalid_request')
      const { result } = await approve(browserContext, clientId)
      const invalid = await exchange(
        browserContext,
        clientId,
        result.searchParams.get('code')!,
        'b'.repeat(64)
      )
      assert.equal(invalid.status(), 400)
    })
    test('ordinary Discord account cannot consent; forged consent without CSRF is refused', async ({
      browserContext,
      assert,
    }) => {
      const clientId = await register(browserContext)
      const ordinary = await User.create({
        email: `${randomUUID()}@example.com`,
        password: 'test-password',
        discordId: `ordinary-${randomUUID().slice(0, 20)}`,
      })
      await browserContext.loginAs(ordinary)
      const response = await browserContext.request.get(authorization(clientId))
      assert.equal(response.status(), 403)
      await browserContext.loginAs(user)
      const page = await browserContext.newPage()
      await page.goto(authorization(clientId))
      await page.getByRole('heading', { name: 'Autoriser Client de recette ?' }).waitFor()
      const forged = await browserContext.request.post(page.url(), {
        form: { decision: 'allow' },
        maxRedirects: 0,
      })
      assert.include([302, 403], forged.status())
      assert.isNull(
        await db
          .from('editorial_connections')
          .where({ user_id: user.id, client_id: clientId })
          .first()
      )
      await page.close()
    })
    test('Discord callback resumes pending MCP authorization using simulated Discord responses', async ({
      browserContext,
      assert,
    }) => {
      const originalFetch = globalThis.fetch
      const savedId = env.get('DISCORD_CLIENT_ID')
      const savedSecret = env.get('DISCORD_CLIENT_SECRET')
      env.set('DISCORD_CLIENT_ID', 'test-discord-client')
      env.set('DISCORD_CLIENT_SECRET', 'test-discord-secret')
      globalThis.fetch = async (input, init) => {
        const url = String(input)
        if (url === 'https://discord.com/api/oauth2/token')
          return Response.json({ access_token: 'simulated-discord-token' })
        if (url === 'https://discord.com/api/users/@me')
          return Response.json({ id: user.discordId, username: 'test-admin', email: user.email })
        return originalFetch(input, init)
      }
      try {
        const clientId = await register(browserContext)
        let response = await browserContext.request.get(authorization(clientId), {
          maxRedirects: 0,
        })
        for (let i = 0; i < 8 && [302, 303].includes(response.status()); i++) {
          const location = response.headers().location
          if (location.startsWith('https://discord.com/')) break
          response = await browserContext.request.get(new URL(location, base).href, {
            maxRedirects: 0,
          })
        }
        const discordUrl = new URL(response.headers().location)
        assert.equal(discordUrl.origin, 'https://discord.com')
        const callbackResponse = await browserContext.request.get(
          `${base}/auth/discord/callback?code=fake-discord-code&state=${discordUrl.searchParams.get('state')}`,
          { maxRedirects: 0 }
        )
        assert.include(callbackResponse.headers().location, '/oauth/interaction/')
        const page = await browserContext.newPage()
        await page.goto(new URL(callbackResponse.headers().location, base).href)
        await page.getByRole('heading', { name: 'Autoriser Client de recette ?' }).waitFor()
        assert.notInclude(page.url(), '/dashboard')
        await page.close()
      } finally {
        globalThis.fetch = originalFetch
        env.set('DISCORD_CLIENT_ID', savedId)
        env.set('DISCORD_CLIENT_SECRET', savedSecret)
      }
    })
    test('PostgreSQL adapter encrypts records and atomically consumes a code once', async ({
      assert,
    }) => {
      const adapter = new OAuthAdapter('AuthorizationCode')
      const id = randomUUID()
      await adapter.upsert(id, { accountId: String(user.id), grantId: 'private-grant' }, 60)
      const row = await db
        .from('mcp_oauth_records')
        .where('model', 'AuthorizationCode')
        .orderBy('expires_at', 'desc')
        .first()
      assert.notInclude(row.payload, 'private-grant')
      const results = await Promise.allSettled([adapter.consume(id), adapter.consume(id)])
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
      assert.isNumber((await adapter.find(id))!.consumed)
    })
  })
}
