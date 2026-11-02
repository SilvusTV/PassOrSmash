/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Form } from '@adonisjs/inertia/react'
import { Head, Link, usePage } from '@inertiajs/react'

export default function Profile({
  statistics,
  connections,
}: {
  statistics: { playlists: number; publicPlaylists: number; votes: number }
  connections: { google: boolean; discord: boolean }
}) {
  const { props } = usePage()
  const user = props.user as unknown as {
    fullName?: string
    username?: string
    email: string
    avatarUrl?: string
    initials: string
    createdAt: string
  }
  return (
    <section className="member-page">
      <Head title="Mon profil">
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <header className="member-heading">
        <div>
          <span className="eyebrow">Ton espace personnel</span>
          <h1>
            Mon profil<span>.</span>
          </h1>
          <p>Ton compte. Tes sélections. Tes coups de cœur.</p>
        </div>
        <Link className="button button-primary" href="/playlists/create">
          Créer une playlist ↗
        </Link>
      </header>
      <div className="member-grid">
        <aside className="member-card member-identity">
          <div className="member-avatar">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.initials}
          </div>
          <span className="member-badge">Dans la communauté</span>
          <h2>{user.fullName || user.username || 'Mon compte'}</h2>
          {user.username && <p>@{user.username}</p>}
          <dl>
            <dt>Membre depuis</dt>
            <dd>
              {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                timeZone: 'Europe/Paris',
                dateStyle: 'long',
              })}
            </dd>
          </dl>
          <Link className="member-text-link" href="/dashboard">
            Voir mes playlists →
          </Link>
        </aside>
        <div className="member-main">
          <div className="member-stats">
            <article>
              <span className="eyebrow">Tes sélections</span>
              <strong>{statistics.playlists}</strong>
              <span>
                playlist{statistics.playlists === 1 ? '' : 's'} créée
                {statistics.playlists === 1 ? '' : 's'}
              </span>
            </article>
            <article>
              <span className="eyebrow">Tes choix</span>
              <strong>{statistics.votes}</strong>
              <span>vote{statistics.votes === 1 ? '' : 's'} avec ce compte</span>
            </article>
          </div>
          <section className="member-card">
            <div className="member-section-title">
              <span className="member-section-number">01</span>
              <h2>Les infos du compte</h2>
            </div>
            <dl className="member-details">
              <div>
                <dt>Nom affiché</dt>
                <dd>{user.fullName || user.username || 'Non renseigné'}</dd>
              </div>
              <div>
                <dt>Adresse e-mail</dt>
                <dd>{user.email}</dd>
              </div>
            </dl>
            <p className="member-note">
              Ces informations sont réservées à ton compte et à l’administration.
            </p>
          </section>
          <section className="member-card">
            <div className="member-section-title">
              <span className="member-section-number">02</span>
              <h2>Tes connexions</h2>
            </div>
            <div className="member-connection">
              <div>
                <strong>Discord</strong>
                <p>{connections.discord ? 'Compte associé' : 'Aucun compte Discord associé'}</p>
              </div>
              <span className="member-connection-status">
                {connections.discord ? 'Connecté' : 'Non associé'}
              </span>
            </div>
            <div className="member-connection">
              <div>
                <strong>Google</strong>
                <p>
                  {connections.google
                    ? 'Tu peux te connecter avec Google.'
                    : 'Une autre façon de retrouver ton compte.'}
                </p>
              </div>
              {connections.google ? (
                <span className="member-connection-status">Connecté</span>
              ) : props.googleEnabled ? (
                <a className="button" href="/auth/google">
                  Associer Google
                </a>
              ) : (
                <span className="member-connection-status">Indisponible</span>
              )}
            </div>
          </section>
          <section className="member-card member-playlists">
            <div>
              <span className="eyebrow">À toi de jouer</span>
              <h2>La prochaine sélection t’attend.</h2>
              <p>
                {statistics.publicPlaylists} publique{statistics.publicPlaylists === 1 ? '' : 's'} ·{' '}
                {statistics.playlists - statistics.publicPlaylists} privée
                {statistics.playlists - statistics.publicPlaylists === 1 ? '' : 's'}
              </p>
            </div>
            <Link className="button button-primary" href="/dashboard">
              Gérer mes playlists →
            </Link>
          </section>
          <div className="member-bottom">
            <Link href="/confidentialite">Mes données et mes droits</Link>
            <Form route="auth.logout">
              <button type="submit" className="member-signout">
                Se déconnecter ↗
              </button>
            </Form>
          </div>
        </div>
      </div>
    </section>
  )
}
