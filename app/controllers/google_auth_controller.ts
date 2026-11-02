import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import User from '#models/user'
import { createHash, randomBytes } from 'node:crypto'
import { verifyGoogleToken } from '#services/google_auth'

const redirectUri = () => `${env.get('APP_URL').replace(/\/$/, '')}/auth/google/callback`
export default class GoogleAuthController {
  async redirect({ session, response, auth }: HttpContext) {
    response.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer')
    if (!env.get('GOOGLE_CLIENT_ID') || !env.get('GOOGLE_CLIENT_SECRET')) {
      session.flash('error', 'La connexion Google n’est pas encore configurée.')
      return response.redirect().toPath('/login')
    }
    const state = randomBytes(32).toString('hex')
    const nonce = randomBytes(32).toString('hex')
    const verifier = randomBytes(32).toString('base64url')
    session.put('google_oauth', {
      state,
      nonce,
      verifier,
      expires: Date.now() + 600000,
      userId: auth.user?.id || null,
    })
    return response
      .redirect()
      .toPath(
        `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: env.get('GOOGLE_CLIENT_ID')!, redirect_uri: redirectUri(), response_type: 'code', scope: 'openid email profile', state, nonce, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account' })}`
      )
  }
  async callback({ session, request, response, auth }: HttpContext) {
    response.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer')
    const pending = session.get('google_oauth')
    session.forget('google_oauth')
    const fail = (message: string) => {
      session.flash('error', message)
      return response
        .redirect()
        .withQs(false)
        .toPath(auth.user ? '/profile' : '/login')
    }
    if (
      !pending ||
      pending.expires < Date.now() ||
      request.input('state') !== pending.state ||
      typeof request.input('code') !== 'string' ||
      (auth.user?.id || null) !== pending.userId
    )
      return fail('Connexion Google annulée ou expirée. Réessayez.')
    try {
      const result = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.get('GOOGLE_CLIENT_ID')!,
          client_secret: env.get('GOOGLE_CLIENT_SECRET')!,
          redirect_uri: redirectUri(),
          code: request.input('code'),
          grant_type: 'authorization_code',
          code_verifier: pending.verifier,
        }),
      })
      if (!result.ok) throw new Error('Google exchange failed')
      const token = (await result.json()) as { id_token?: string }
      if (!token.id_token) throw new Error('Missing ID token')
      const profile = await verifyGoogleToken(token.id_token, pending.nonce)
      let user = await User.findBy('googleId', profile.sub)
      if (pending.userId) {
        if (user && user.id !== pending.userId)
          return fail('Ce compte Google est déjà associé à un autre compte.')
        user = await User.findOrFail(pending.userId)
        if (user.suspendedAt) return response.forbidden('Ce compte est suspendu.')
        if (user.googleId && user.googleId !== profile.sub)
          return fail('Un autre compte Google est déjà associé.')
        user.googleId = profile.sub
        await user.save()
        session.flash(
          'success',
          'Compte Google associé. Vous pouvez désormais l’utiliser pour vous connecter.'
        )
        return response.redirect().withQs(false).toPath('/profile')
      }
      if (!user) {
        const email = profile.email.toLowerCase()
        if (await User.query().whereRaw('lower(email) = ?', [email]).first())
          return fail(
            'Un compte utilise déjà cette adresse. Connectez-vous avec votre méthode habituelle puis associez Google depuis votre profil.'
          )
        user = await User.create({
          googleId: profile.sub,
          email,
          fullName: profile.name || null,
          avatarUrl: profile.picture || null,
          password: randomBytes(48).toString('hex'),
        })
      }
      if (user.suspendedAt) return response.forbidden('Ce compte est suspendu.')
      await auth.use('web').login(user)
      return response.redirect().withQs(false).toPath('/dashboard')
    } catch {
      return fail('La connexion Google a échoué. Réessayez.')
    }
  }
}
