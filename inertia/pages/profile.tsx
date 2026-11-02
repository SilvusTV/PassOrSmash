/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Head, Link, usePage } from '@inertiajs/react'

export default function Profile({
  statistics,
}: {
  statistics: { playlists: number; votes: number }
}) {
  const { user } = usePage().props as unknown as {
    user: {
      fullName?: string
      username?: string
      email: string
      avatarUrl?: string
      initials: string
      createdAt: string
    }
  }
  return (
    <section className="profile-page">
      <Head title="Mon profil">
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <span className="eyebrow">Mon compte</span>
      <h1>Mon profil.</h1>
      <div className="profile-panel">
        {usePage().props.googleEnabled && (
          <a className="button" href="/auth/google">
            Associer mon compte Google
          </a>
        )}
        <div className="profile-identity">
          <div className="profile-avatar">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.initials}
          </div>
          <div>
            <h2>{user.fullName || user.username || 'Mon compte'}</h2>
            {user.username && <p>@{user.username}</p>}
          </div>
        </div>
        <dl>
          <dt>Adresse e-mail</dt>
          <dd>{user.email}</dd>
          <dt>Membre depuis</dt>
          <dd>
            {new Date(user.createdAt).toLocaleDateString('fr-FR', {
              timeZone: 'Europe/Paris',
              dateStyle: 'long',
            })}
          </dd>
        </dl>
        <div className="profile-statistics">
          <p>
            <strong>{statistics.playlists}</strong> playlists créées
          </p>
          <p>
            <strong>{statistics.votes}</strong> votes avec ce compte
          </p>
        </div>
        <Link className="button button-primary" href="/dashboard">
          Voir mes playlists
        </Link>
      </div>
    </section>
  )
}
