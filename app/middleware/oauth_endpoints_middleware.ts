import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'
import { fingerprint } from '#services/oauth/adapter'
import { getOAuthProvider, oauthIssuer } from '#services/oauth/provider'

async function rateLimit(identity: string, limit: number, seconds: number) {
  const bucket = Math.floor(Date.now() / (seconds * 1000))
  return db.transaction(async (trx) => {
    const key = fingerprint(`${identity}:${bucket}`)
    await trx.rawQuery('select pg_advisory_xact_lock(hashtextextended(?, 0))', [key])
    const row = await trx.from('mcp_oauth_rate_limits').where('key', key).first()
    if (row && row.count >= limit) return false
    await trx
      .table('mcp_oauth_rate_limits')
      .insert({
        key,
        count: (row?.count || 0) + 1,
        expires_at: new Date((bucket + 1) * seconds * 1000),
      })
      .onConflict('key')
      .merge()
    await trx.from('mcp_oauth_rate_limits').where('expires_at', '<', new Date()).delete()
    return true
  })
}

/** Runs before Adonis's body parser: oidc-provider must own the raw OAuth request body. */
export default class OAuthEndpointsMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const path = request.url()
    if (
      ![
        '/oauth/token',
        '/oauth/register',
        '/oauth/revoke',
        '/oauth/jwks',
        '/oauth/authorize',
      ].includes(path) &&
      !/^\/oauth\/authorize\/[\w-]+$/.test(path)
    )
      return next()
    if (request.header('host') !== new URL(oauthIssuer()).host)
      return response.forbidden({ error: 'invalid_request' })
    const ip = request.request.socket.remoteAddress || 'unknown'
    if (
      !(await rateLimit(`oauth:${ip}`, 120, 60)) ||
      (path === '/oauth/register' &&
        (!(await rateLimit(`registration:${ip}`, 10, 60)) ||
          !(await rateLimit('registration:global', 100, 86400))))
    )
      return response
        .header('Retry-After', '60')
        .tooManyRequests({ error: 'temporarily_unavailable' })
    response.response.setHeader('Cache-Control', 'no-store')
    response.response.setHeader('Referrer-Policy', 'no-referrer')
    response.response.setHeader('X-Content-Type-Options', 'nosniff')
    response.response.setHeader('X-Frame-Options', 'DENY')
    const provider = await getOAuthProvider()
    await provider.callback()(request.request, response.response)
  }
}
