import type { HttpContext } from '@adonisjs/core/http'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { toNodeHandler } from '@modelcontextprotocol/node'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import env from '#start/env'
import { createEditorialServer } from '../mcp/server.js'
import { EditorialError, scopes } from '#services/editorial/contracts'
import { authorizeMcpClaims } from '#services/editorial/mcp_access'
import { oauthIssuer, verifyLocalAccessToken } from '#services/oauth/provider'

const jwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>()
export default class McpController {
  async metadata({ response }: HttpContext) {
    const issuer = env.get('MCP_OAUTH_ISSUER') || oauthIssuer()
    return response.header('Access-Control-Allow-Origin', '*').send({
      resource: `${env.get('APP_URL').replace(/\/$/, '')}/mcp`,
      authorization_servers: [issuer],
      scopes_supported: [...scopes],
      bearer_methods_supported: ['header'],
    })
  }
  async handle({ request, response }: HttpContext) {
    const base = new URL(env.get('APP_URL'))
    const origins = [
      base.origin,
      ...(env.get('MCP_ALLOWED_ORIGINS') || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ]
    if (
      request.header('host') !== base.host ||
      (request.header('origin') && !origins.includes(request.header('origin')!))
    )
      return response.forbidden({ error: 'Origine ou hôte refusé.' })
    const issuer = env.get('MCP_OAUTH_ISSUER')
    const jwksUrl = env.get('MCP_OAUTH_JWKS_URL')
    if (
      issuer &&
      (!jwksUrl || new URL(issuer).protocol !== 'https:' || new URL(jwksUrl).protocol !== 'https:')
    )
      return response.serviceUnavailable({ error: 'MCP OAuth non configuré.' })
    const token = request.header('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1]
    const unauthorized = () =>
      response
        .header(
          'WWW-Authenticate',
          `Bearer resource_metadata="${base.origin}/.well-known/oauth-protected-resource/mcp", scope="editorial:read"`
        )
        .unauthorized({ error: 'invalid_token' })
    if (!token) return unauthorized()
    let actor
    try {
      if (!issuer) actor = await authorizeMcpClaims(await verifyLocalAccessToken(token))
      else {
        if (!jwks.has(jwksUrl!))
          jwks.set(jwksUrl!, createRemoteJWKSet(new URL(jwksUrl!), { timeoutDuration: 5000 }))
        const { payload } = await jwtVerify(token, jwks.get(jwksUrl!)!, {
          issuer,
          audience: `${base.origin}/mcp`,
          algorithms: ['RS256', 'ES256'],
          requiredClaims: ['exp', 'sub', 'iat'],
        })
        actor = await authorizeMcpClaims(payload)
      }
    } catch (error) {
      if (error instanceof EditorialError && error.code === 'INSUFFICIENT_SCOPE')
        return response
          .header('WWW-Authenticate', 'Bearer error="insufficient_scope", scope="editorial:read"')
          .forbidden({ error: 'insufficient_scope' })
      return unauthorized()
    }
    const handler = createMcpHandler(() => createEditorialServer(actor))
    try {
      await toNodeHandler(handler)(request.request, response.response, request.body())
    } finally {
      await handler.close()
    }
  }
}
