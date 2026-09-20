/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Link } from '@inertiajs/react'
import Seo from '~/components/seo'

type Card = {
  id: number
  slug: string
  title: string
  description?: string
  cover?: string
  itemCount: number
  plays: number
  accent: string
}
export default function Explore({ playlists }: { playlists: Card[] }) {
  return (
    <>
      <Seo
        title="Jeux Smash or Pass à découvrir"
        description="Découvre les playlists Smash or Pass publiques, vote gratuitement et compare tes choix avec ceux de la communauté."
        path="/explore"
      />
      <section className="page-hero">
        <span className="eyebrow">Place au verdict</span>
        <h1>
          Explore les
          <br />
          <em>playlists.</em>
        </h1>
        <p>
          Trouve un thème, fais défiler les images et donne ton verdict. Pas besoin de compte pour
          jouer.
        </p>
      </section>
      <section className="content-section">
        {playlists.length ? (
          <div className="playlist-grid">
            {playlists.map((card, index) => (
              <article className={`playlist-card accent-${card.accent}`} key={card.id}>
                <Link href={`/p/${card.slug}`}>
                  <div
                    className="card-cover"
                    style={card.cover ? { backgroundImage: `url(${card.cover})` } : undefined}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <b>{card.itemCount} images</b>
                  </div>
                  <div className="card-body">
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                    <div>
                      <span>{card.plays || 0} parties</span>
                      <strong>JOUER ↗</strong>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span>◇</span>
            <h2>La piste est encore vide.</h2>
            <p>Sois la première personne à lancer une playlist.</p>
            <a href="/auth/discord" className="button button-primary">
              Créer la première
            </a>
          </div>
        )}
      </section>
    </>
  )
}
