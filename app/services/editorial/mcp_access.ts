import db from '@adonisjs/lucid/services/db'
import type { JWTPayload } from 'jose'
import User from '#models/user'
import { isEditorialAdmin } from './access.js'
import { type Actor, EditorialError, scopes } from './contracts.js'

/** Only call after signature, issuer, audience and expiry have been verified. */
export async function authorizeMcpClaims(payload: JWTPayload): Promise<Actor> {
  const clientId = payload.client_id || payload.azp
  if (typeof payload.sub !== 'string' || typeof clientId !== 'string')
    throw new EditorialError('FORBIDDEN', 'Identité OAuth incomplète.')
  const connection = await db
    .from('editorial_connections')
    .where({ subject: payload.sub, client_id: clientId, revoked: false })
    .where('expires_at', '>', new Date())
    .first()
  const user = connection && (await User.find(connection.user_id))
  if (!connection || !user || !isEditorialAdmin(user))
    throw new EditorialError('FORBIDDEN', 'Connexion OAuth expirée, révoquée ou inconnue.')
  const tokenScopes = typeof payload.scope === 'string' ? payload.scope.split(' ') : []
  const allowed = connection.scopes.filter(
    (scope: string) =>
      tokenScopes.includes(scope) && scopes.includes(scope as (typeof scopes)[number])
  )
  if (!allowed.includes('editorial:read'))
    throw new EditorialError('INSUFFICIENT_SCOPE', 'La portée editorial:read est requise.')
  return { userId: user.id, identity: `mcp:${connection.id}`, scopes: allowed }
}
