import { createRemoteJWKSet, jwtVerify } from 'jose'
import env from '#start/env'
import { z } from 'zod'

const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
export const googleProfile = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().max(254),
  email_verified: z.literal(true),
  nonce: z.string(),
  name: z.string().max(255).optional(),
  picture: z.url({ protocol: /^https$/ }).optional(),
})
export async function verifyGoogleToken(token: string, nonce: string) {
  const { payload } = await jwtVerify(token, keys, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: env.get('GOOGLE_CLIENT_ID'),
    algorithms: ['RS256'],
    requiredClaims: ['exp', 'iat', 'sub', 'nonce'],
  })
  const profile = googleProfile.parse(payload)
  if (profile.nonce !== nonce) throw new Error('Invalid Google nonce')
  return profile
}
