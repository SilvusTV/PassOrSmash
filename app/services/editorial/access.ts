import env from '#start/env'
import type User from '#models/user'
import { scopes, type Actor } from './contracts.js'

export function isEditorialAdmin(
  user?: Pick<User, 'id' | 'discordId'> & { suspendedAt?: unknown }
) {
  const ids = (env.get('EDITORIAL_ADMIN_DISCORD_IDS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return !!user?.discordId && !user.suspendedAt && ids.includes(user.discordId)
}
export function dashboardActor(user: User): Actor {
  return { userId: user.id, identity: `dashboard:${user.id}`, scopes: [...scopes] }
}
