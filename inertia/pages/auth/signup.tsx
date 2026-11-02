/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Form } from '@adonisjs/inertia/react'
import { Head, Link } from '@inertiajs/react'
import AuthOptions from '~/components/auth_options'
export default function Signup() {
  return (
    <section className="auth-page">
      <Head title="Créer un compte" />
      <span className="eyebrow">Rejoignez le jeu</span>
      <h1>Créer un compte.</h1>
      <div className="auth-panel">
        <AuthOptions />
        <p className="auth-divider">ou avec votre adresse e-mail</p>
        <Form route="new_account.store">
          {({ errors, processing }) => (
            <>
              <label htmlFor="fullName">Nom affiché</label>
              <input id="fullName" name="fullName" maxLength={120} required autoComplete="name" />
              {errors.fullName && <p role="alert">{errors.fullName}</p>}
              <label htmlFor="email">Adresse e-mail</label>
              <input id="email" name="email" type="email" required autoComplete="email" />
              {errors.email && <p role="alert">{errors.email}</p>}
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
              <small>Au moins 8 caractères.</small>
              {errors.password && <p role="alert">{errors.password}</p>}
              <label htmlFor="passwordConfirmation">Confirmer le mot de passe</label>
              <input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type="password"
                required
                autoComplete="new-password"
              />
              {errors.passwordConfirmation && <p role="alert">{errors.passwordConfirmation}</p>}
              <button className="button button-primary" disabled={processing} type="submit">
                Créer mon compte
              </button>
            </>
          )}
        </Form>
        <p>
          Déjà inscrit ? <Link href="/login">Se connecter</Link>
        </p>
      </div>
    </section>
  )
}
