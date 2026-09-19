import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import string from '@adonisjs/core/helpers/string'

export default class DiscordAuthController {
  async redirect({ response, session }: HttpContext) {
    if (!env.get('DISCORD_CLIENT_ID') || env.get('DISCORD_CLIENT_ID') === 'placeholder') {
      session.flash(
        'error',
        'Ajoutez vos identifiants Discord dans le fichier .env pour activer la connexion.'
      )
      return response.redirect().toRoute('home')
    }
    const state = string.random(40)
    session.put('discord_oauth_state', state)
    const query = new URLSearchParams({
      client_id: env.get('DISCORD_CLIENT_ID'),
      redirect_uri: env.get('DISCORD_REDIRECT_URI'),
      response_type: 'code',
      scope: 'identify email',
      state,
    })
    return response.redirect().toPath(`https://discord.com/oauth2/authorize?${query}`)
  }

  async callback({ request, response, session, auth }: HttpContext) {
    const code = request.input('code')
    if (!code || request.input('state') !== session.get('discord_oauth_state'))
      return response.redirect().toRoute('auth.error')
    try {
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.get('DISCORD_CLIENT_ID'),
          client_secret: env.get('DISCORD_CLIENT_SECRET'),
          grant_type: 'authorization_code',
          code,
          redirect_uri: env.get('DISCORD_REDIRECT_URI'),
        }),
      })
      const token = (await tokenResponse.json()) as { access_token?: string }
      if (!token.access_token) throw new Error('Discord token missing')
      const profileResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      })
      const profile = (await profileResponse.json()) as {
        id: string
        username: string
        global_name?: string
        email?: string
        avatar?: string
      }
      const values = {
        email: profile.email || `${profile.id}@discord.local`,
        fullName: profile.global_name || profile.username,
        username: profile.username,
        avatarUrl: profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null,
      }
      const user = await User.firstOrCreate(
        { discordId: profile.id },
        { ...values, password: await hash.make(string.random(48)) }
      )
      user.merge(values)
      await user.save()
      await auth.use('web').login(user)
      session.forget('discord_oauth_state')
      return response.redirect().toRoute('playlists.index')
    } catch {
      return response.redirect().toRoute('auth.error')
    }
  }

  async error({ inertia }: HttpContext) {
    return inertia.render('auth/error', {})
  }

  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect().toRoute('home')
  }
}
