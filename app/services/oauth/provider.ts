import Provider, { errors, type Configuration } from 'oidc-provider'
import { createLocalJWKSet, exportJWK, generateKeyPair, jwtVerify, type JSONWebKeySet } from 'jose'
import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import encryption from '@adonisjs/core/services/encryption'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import User from '#models/user'
import { isEditorialAdmin } from '#services/editorial/access'
import { scopes } from '#services/editorial/contracts'
import OAuthAdapter from './adapter.js'

export function oauthIssuer() {
  return new URL(env.get('APP_URL')).origin
}
export function oauthResource() {
  return `${oauthIssuer()}/mcp`
}
export function validRedirect(value: string) {
  try {
    const url = new URL(value)
    return (
      !url.username &&
      !url.password &&
      !url.hash &&
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)))
    )
  } catch {
    return false
  }
}
let instance: Promise<Provider> | undefined
let signingKeys: JSONWebKeySet | undefined
async function keys() {
  let row = await db.from('mcp_oauth_keys').where('id', 1).first()
  if (!row) {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true })
    const jwk = { ...(await exportJWK(privateKey)), kid: randomUUID(), alg: 'RS256', use: 'sig' }
    await db
      .table('mcp_oauth_keys')
      .insert({ id: 1, jwks: encryption.encrypt({ keys: [jwk] }) })
      .onConflict('id')
      .ignore()
    row = await db.from('mcp_oauth_keys').where('id', 1).first()
  }
  const jwks = encryption.decrypt<JSONWebKeySet>(row.jwks)
  if (!jwks?.keys.length)
    throw new Error(
      'MCP signing keys cannot be decrypted. Preserve APP_KEY and the OAuth database.'
    )
  signingKeys = jwks
  return jwks
}
export function oauthMetadata() {
  const issuer = oauthIssuer()
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    jwks_uri: `${issuer}/oauth/jwks`,
    registration_endpoint: `${issuer}/oauth/register`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: [...scopes],
    authorization_response_iss_parameter_supported: true,
  }
}
export function getOAuthProvider(): Promise<Provider> {
  instance ||= createProvider().catch((error) => {
    instance = undefined
    throw error
  })
  return instance
}
async function createProvider() {
  const configuration: Configuration = {
    adapter: OAuthAdapter,
    jwks: await keys(),
    cookies: {
      keys: [env.get('APP_KEY').release()],
      names: {
        session: 'pos_oauth_session',
        interaction: 'pos_oauth_interaction',
        resume: 'pos_oauth_resume',
      },
      short: { sameSite: 'lax', httpOnly: true, secure: app.inProduction },
      long: { sameSite: 'lax', httpOnly: true, secure: app.inProduction },
    },
    clients: [],
    clientDefaults: {
      token_endpoint_auth_method: 'none',
      response_types: ['code'],
      grant_types: ['authorization_code', 'refresh_token'],
    },
    clientAuthMethods: ['none'],
    responseTypes: ['code'],
    scopes: ['openid'],
    subjectTypes: ['public'],
    pkce: { required: () => true },
    renderError(ctx) {
      ctx.type = 'html'
      ctx.body =
        '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Connexion MCP impossible</title><body><h1>Connexion MCP impossible</h1><p>La demande est invalide ou a expiré. Relancez la connexion depuis votre application.</p></body></html>'
    },
    features: {
      devInteractions: { enabled: false },
      registration: { enabled: true },
      revocation: {
        enabled: true,
        allowedPolicy: (_ctx, client, token) => client.clientId === token.clientId,
      },
      userinfo: { enabled: false },
      requestObjects: { enabled: false },
      resourceIndicators: {
        enabled: true,
        defaultResource: () => oauthResource(),
        useGrantedResource: () => true,
        getResourceServerInfo: (_ctx, resource) => {
          if (resource !== oauthResource()) throw new errors.InvalidTarget('Unknown MCP resource')
          return {
            scope: scopes.join(' '),
            audience: oauthResource(),
            accessTokenFormat: 'jwt',
            accessTokenTTL: 900,
            jwt: { sign: { alg: 'RS256' } },
          }
        },
      },
    },
    extraClientMetadata: {
      properties: ['editorial_client'],
      validator: (_ctx, _key, _value, metadata) => {
        if (
          metadata.token_endpoint_auth_method !== 'none' ||
          metadata.jwks_uri ||
          metadata.jwks ||
          metadata.sector_identifier_uri ||
          metadata.request_uris ||
          !metadata.redirect_uris?.length ||
          metadata.redirect_uris.length > 5 ||
          !metadata.redirect_uris.every(validRedirect) ||
          (metadata.client_name?.length || 0) > 120 ||
          metadata.grant_types?.some(
            (grant) => !['authorization_code', 'refresh_token'].includes(grant)
          )
        )
          throw new errors.InvalidClientMetadata(
            'Only public PKCE clients with safe redirect URIs are supported'
          )
      },
    },
    routes: {
      authorization: '/oauth/authorize',
      token: '/oauth/token',
      jwks: '/oauth/jwks',
      registration: '/oauth/register',
      revocation: '/oauth/revoke',
    },
    interactions: { url: (_ctx, interaction) => `/oauth/interaction/${interaction.uid}` },
    async findAccount(_ctx, accountId) {
      const user = await User.find(Number(accountId))
      if (!user || !isEditorialAdmin(user)) return undefined
      return { accountId: String(user.id), claims: async () => ({ sub: String(user.id) }) }
    },
    // Require fresh consent for each authorization request, but honor its explicit result on resume.
    async loadExistingGrant(ctx) {
      const grantId = ctx.oidc.result?.consent?.grantId
      return grantId ? ctx.oidc.provider.Grant.find(grantId) : undefined
    },
    async extraTokenClaims(_ctx, token) {
      if (!('grantId' in token) || !token.grantId)
        throw new errors.InvalidGrant('User authorization required')
      const connection = await db
        .from('editorial_connections')
        .where({ oauth_grant_id: token.grantId, revoked: false })
        .where('expires_at', '>', new Date())
        .first()
      const user = connection && (await User.find(connection.user_id))
      if (!connection || !user || !isEditorialAdmin(user))
        throw new errors.InvalidGrant('Editorial authorization revoked')
      return { grant_id: token.grantId }
    },
    issueRefreshToken: (_ctx, client) => client.grantTypeAllowed('refresh_token'),
    rotateRefreshToken: true,
    expiresWithSession: () => false,
    ttl: {
      AccessToken: 900,
      AuthorizationCode: 60,
      Interaction: 600,
      Session: 3600,
      Grant: 30 * 86400,
      RefreshToken: 30 * 86400,
    },
    clientBasedCORS: (_ctx, origin, client) =>
      client.redirectUris?.some((uri) => new URL(uri).origin === origin) || false,
  }
  const provider = new Provider(oauthIssuer(), configuration)
  provider.proxy = app.inProduction
  return provider
}
export async function verifyLocalAccessToken(token: string) {
  await getOAuthProvider()
  const publicKeys = {
    keys: signingKeys!.keys.map(({ kty, kid, alg, use, n, e }) => ({ kty, kid, alg, use, n, e })),
  }
  const { payload } = await jwtVerify(token, createLocalJWKSet(publicKeys), {
    issuer: oauthIssuer(),
    audience: oauthResource(),
    algorithms: ['RS256'],
    typ: 'at+jwt',
    requiredClaims: ['exp', 'sub', 'iat', 'jti', 'grant_id'],
  })
  const grant =
    typeof payload.grant_id === 'string' && (await new OAuthAdapter('Grant').find(payload.grant_id))
  if (!grant) throw new errors.InvalidGrant('Authorization grant revoked')
  return payload
}
