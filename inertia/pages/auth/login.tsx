/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Form } from '@adonisjs/inertia/react'
import { Head, Link } from '@inertiajs/react'
import AuthOptions from '~/components/auth_options'
export default function Login() {
  return (
    <section className="auth-page">
      <Head title="Se connecter" />
      <span className="eyebrow">Bienvenue</span>
      <h1>Se connecter.</h1>
      <div className="auth-panel">
        <AuthOptions />
        <p className="auth-divider">ou avec votre adresse e-mail</p>
        <Form route="session.store">
          {({ errors, processing }) => (
            <>
              <label htmlFor="email">Adresse e-mail</label>
              <input id="email" name="email" type="email" required autoComplete="username" />
              {errors.email && <p role="alert">{errors.email}</p>}
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
              {errors.password && <p role="alert">{errors.password}</p>}
              <button className="button button-primary" disabled={processing} type="submit">
                Se connecter par e-mail
              </button>
            </>
          )}
        </Form>
        <p>
          Pas encore de compte ? <Link href="/signup">Créer un compte</Link>
        </p>
      </div>
    </section>
  )
}
