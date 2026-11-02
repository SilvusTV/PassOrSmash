import User from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  async store({ request, auth, response, session }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    let user: User
    try {
      user = await User.verifyCredentials(email, password)
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'E_INVALID_CREDENTIALS')
        throw error
      session.flash('inputErrorsBag', { email: 'Adresse e-mail ou mot de passe incorrect.' })
      return response.redirect().withQs(false).toPath('/login')
    }
    if (user.suspendedAt) return response.forbidden('Ce compte est suspendu.')

    await auth.use('web').login(user)
    response.redirect().toRoute('home')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
