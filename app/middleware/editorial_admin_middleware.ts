import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { isEditorialAdmin } from '#services/editorial/access'

export default class EditorialAdminMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    response
      .header('Cache-Control', 'private, no-store')
      .header('X-Robots-Tag', 'noindex, nofollow')
      .header('Referrer-Policy', 'same-origin')
    if (!isEditorialAdmin(auth.user)) return response.forbidden()
    return next()
  }
}
