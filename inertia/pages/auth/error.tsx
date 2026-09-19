/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Head, Link } from '@inertiajs/react'
export default function Error() {
  return (
    <>
      <Head title="Connexion interrompue" />
      <section className="empty-state full-page">
        <span>×</span>
        <h1>La connexion Discord a échoué.</h1>
        <p>Rien n’a été créé. Tu peux réessayer ou revenir tranquillement à l’accueil.</p>
        <div>
          <a className="button button-primary" href="/auth/discord">
            Réessayer
          </a>
          <Link className="text-link" href="/">
            Retour à l’accueil
          </Link>
        </div>
      </section>
    </>
  )
}
