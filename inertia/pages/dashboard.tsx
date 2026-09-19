/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Head, Link, router } from '@inertiajs/react'
type Card = {
  id: number
  slug: string
  title: string
  description?: string
  cover?: string
  itemCount: number
  plays: number
  isPublic: boolean
  accent: string
}
export default function Dashboard({ playlists }: { playlists: Card[] }) {
  return (
    <>
      <Head title="Mes playlists" />
      <section className="dashboard-head">
        <div>
          <span className="eyebrow">Ton espace</span>
          <h1>
            Mes playlists<span>.</span>
          </h1>
          <p>Crée, partage et suis les choix de ta communauté.</p>
        </div>
        <Link className="button button-primary" href="/playlists/create">
          ＋ Nouvelle playlist
        </Link>
      </section>
      <section className="content-section">
        {playlists.length ? (
          <div className="dashboard-grid">
            {playlists.map((card) => (
              <article className={`dashboard-card accent-${card.accent}`} key={card.id}>
                <div
                  className="dashboard-cover"
                  style={card.cover ? { backgroundImage: `url(${card.cover})` } : undefined}
                >
                  <span className="status-pill">{card.isPublic ? 'PUBLIQUE' : 'PRIVÉE'}</span>
                </div>
                <div className="dashboard-body">
                  <span>
                    {card.itemCount} images · {card.plays} parties
                  </span>
                  <h2>{card.title}</h2>
                  <p>{card.description}</p>
                  <div className="dashboard-actions">
                    <Link href={`/p/${card.slug}`}>Jouer ↗</Link>
                    <Link href={`/p/${card.slug}/edit`}>Modifier</Link>
                    <button
                      onClick={() =>
                        confirm('Supprimer définitivement cette playlist ?') &&
                        router.delete(`/p/${card.slug}`)
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span>＋</span>
            <h2>À toi de lancer le premier débat.</h2>
            <p>Deux images suffisent pour commencer.</p>
            <Link className="button button-primary" href="/playlists/create">
              Créer une playlist
            </Link>
          </div>
        )}
      </section>
    </>
  )
}
