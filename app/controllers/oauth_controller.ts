import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import db from '@adonisjs/lucid/services/db'
import { getOAuthProvider, oauthMetadata, oauthResource } from '#services/oauth/provider'
import { isEditorialAdmin, dashboardActor } from '#services/editorial/access'
import { scopes } from '#services/editorial/contracts'
import { audit } from '#services/editorial/proposals'
import OAuthAdapter, { fingerprint } from '#services/oauth/adapter'

export default class OauthController {
  metadata({ response }: HttpContext) {
    return response
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'no-store')
      .send(oauthMetadata())
  }
  async interaction(ctx: HttpContext) {
    const details = await this.details(ctx)
    if (!details) return
    const { provider, interaction } = details
    if (!ctx.auth.user) {
      ctx.session.put('mcp_oauth_interaction', interaction.uid)
      return ctx.response.redirect().withQs(false).toPath('/auth/discord')
    }
    if (!isEditorialAdmin(ctx.auth.user))
      return ctx.response.forbidden(
        'Votre compte Discord ne possède pas les droits administrateur nécessaires au MCP.'
      )
    if (interaction.prompt.name === 'login') {
      const returnTo = await provider.interactionResult(
        ctx.request.request,
        ctx.response.response,
        { login: { accountId: String(ctx.auth.user.id), remember: false, amr: ['discord'] } },
        { mergeWithLastSubmission: false }
      )
      return ctx.response.redirect().withQs(false).toPath(returnTo)
    }
    if (
      interaction.prompt.name !== 'consent' ||
      interaction.session?.accountId !== String(ctx.auth.user.id)
    )
      return ctx.response.forbidden('La session a changé. Recommencez la connexion MCP.')
    const client = await provider.Client.find(String(interaction.params.client_id))
    if (!client) return ctx.response.badRequest('Client OAuth introuvable.')
    const requested = String(interaction.params.scope || '')
      .split(' ')
      .filter(Boolean)
    if (
      !requested.includes('editorial:read') ||
      requested.some((scope) => !scopes.includes(scope as (typeof scopes)[number]))
    )
      return ctx.response.badRequest('Portées éditoriales invalides.')
    return ctx.inertia.render('oauth/consent', {
      uid: interaction.uid,
      clientName: client.clientName || 'Client MCP',
      clientId: client.clientId,
      redirectOrigin: new URL(String(interaction.params.redirect_uri)).origin,
      requestedScopes: requested,
      accountName: ctx.auth.user.fullName || ctx.auth.user.username || 'Administrateur Discord',
      csrfToken: ctx.request.csrfToken,
    })
  }
  async decision(ctx: HttpContext) {
    const details = await this.details(ctx)
    if (!details) return
    const { provider, interaction } = details
    if (
      !ctx.auth.user ||
      !isEditorialAdmin(ctx.auth.user) ||
      interaction.prompt.name !== 'consent' ||
      interaction.session?.accountId !== String(ctx.auth.user.id)
    )
      return ctx.response.forbidden('Autorisation administrateur requise.')
    const decision = z.enum(['allow', 'deny']).safeParse(ctx.request.input('decision'))
    if (!decision.success) return ctx.response.badRequest('Décision invalide.')
    if (decision.data === 'deny') {
      const returnTo = await provider.interactionResult(
        ctx.request.request,
        ctx.response.response,
        {
          error: 'access_denied',
          error_description: 'Authorization declined by the administrator',
        },
        { mergeWithLastSubmission: false }
      )
      return ctx.response.redirect().withQs(false).toPath(returnTo)
    }
    const clientId = String(interaction.params.client_id)
    const resources = Array.isArray(interaction.params.resource)
      ? interaction.params.resource
      : [interaction.params.resource || oauthResource()]
    const requested = String(interaction.params.scope || '')
      .split(' ')
      .filter(Boolean)
    if (
      !requested.includes('editorial:read') ||
      requested.some((scope) => !scopes.includes(scope as (typeof scopes)[number])) ||
      resources.length !== 1 ||
      resources[0] !== oauthResource()
    )
      return ctx.response.badRequest('Ressource ou droits invalides.')
    const grant = new provider.Grant({ accountId: String(ctx.auth.user.id), clientId })
    grant.addResourceScope(oauthResource(), requested.join(' '))
    const grantId = await grant.save()
    try {
      await db.transaction(async (trx) => {
        const subject = String(ctx.auth.user!.id)
        await trx.rawQuery('select pg_advisory_xact_lock(hashtextextended(?, 0))', [
          `oauth-consent:${subject}:${clientId}`,
        ])
        const previous = await trx
          .from('editorial_connections')
          .where({ subject, client_id: clientId })
          .first()
        await trx
          .table('editorial_connections')
          .insert({
            id: randomUUID(),
            subject,
            client_id: clientId,
            user_id: ctx.auth.user!.id,
            scopes: JSON.stringify(requested),
            expires_at: new Date(Date.now() + 30 * 86400000),
            oauth_grant_id: grantId,
            revoked: false,
          })
          .onConflict(['subject', 'client_id'])
          .merge({
            scopes: JSON.stringify(requested),
            expires_at: new Date(Date.now() + 30 * 86400000),
            oauth_grant_id: grantId,
            revoked: false,
          })
        if (previous?.oauth_grant_id)
          await trx
            .from('mcp_oauth_records')
            .where({ model: 'Grant', key: fingerprint(previous.oauth_grant_id) })
            .delete()
        await audit(trx, dashboardActor(ctx.auth.user!), 'oauth_consent', undefined, undefined, {
          client_id: clientId,
          scopes: requested,
        })
      })
    } catch (error) {
      await new OAuthAdapter('Grant').destroy(grantId)
      throw error
    }
    const returnTo = await provider.interactionResult(
      ctx.request.request,
      ctx.response.response,
      { consent: { grantId } },
      { mergeWithLastSubmission: true }
    )
    return ctx.response.redirect().withQs(false).toPath(returnTo)
  }
  private async details(ctx: HttpContext) {
    ctx.response.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer')
    try {
      const provider = await getOAuthProvider()
      const interaction = await provider.interactionDetails(
        ctx.request.request,
        ctx.response.response
      )
      if (interaction.uid !== ctx.params.uid) throw new Error('Interaction mismatch')
      return { provider, interaction }
    } catch {
      ctx.response.badRequest(
        'Cette demande de connexion a expiré. Relancez la connexion MCP depuis votre application.'
      )
      return null
    }
  }
}
