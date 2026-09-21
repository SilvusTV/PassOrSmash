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
const demoCards: Card[] = [
  {
    id: -1,
    slug: '',
    title: 'Les meilleurs snacks de soirée',
    description: 'Le débat qui divise tous les groupes.',
    cover:
      'https://images.unsplash.com/photo-1621939514649-280e2aa9454f?auto=format&fit=crop&w=900&q=80',
    itemCount: 12,
    plays: 0,
    accent: 'coral',
  },
  {
    id: -2,
    slug: '',
    title: 'Destinations de rêve',
    description: 'Plage secrète ou sommet enneigé ?',
    cover:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    itemCount: 16,
    plays: 0,
    accent: 'sky',
  },
  {
    id: -3,
    slug: '',
    title: 'Designs iconiques',
    description: 'Le beau, le bizarre et l’inoubliable.',
    cover:
      'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=900&q=80',
    itemCount: 10,
    plays: 0,
    accent: 'violet',
  },
]

export default function Home({ featured = [] }: { featured: Card[] }) {
  const cards = featured.length ? featured : demoCards
  return (
    <>
      <Seo
        title="Pass or Smash"
        description="Crée gratuitement un jeu Smash or Pass avec tes images, partage-le et découvre les choix de tes amis ou de ta communauté."
        path="/"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          'name': 'Pass or Smash',
          'url': 'https://passorsmash.fr/',
          'applicationCategory': 'GameApplication',
          'operatingSystem': 'Web',
          'inLanguage': 'fr-FR',
          'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR' },
        }}
      />
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">
            <i /> Le jeu qui met tout le monde d’accord. Ou pas.
          </span>
          <h1>
            À toi de
            <br />
            <em>trancher.</em>
          </h1>
          <p>
            Crée une playlist d’images, partage-la avec ta communauté et laisse chacun choisir :{' '}
            <strong>Smash</strong> ou <strong>Pass</strong>.
          </p>
          <div className="hero-actions">
            <a href="/auth/discord" className="button button-primary">
              Créer ma playlist <span>↗</span>
            </a>
            <Link href="/explore" className="text-link">
              Voir les playlists <span>→</span>
            </Link>
          </div>
          <small>Gratuit · Connexion sécurisée via Discord · Aucune installation</small>
        </div>
        <div className="hero-demo" aria-label="Aperçu du jeu">
          <div className="demo-card">
            <div className="demo-image">
              <img
                src="https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=720&q=75"
                alt="Côte amalfitaine"
                fetchPriority="high"
                decoding="async"
                width="720"
                height="480"
              />
              <span className="live-pill">EN COURS</span>
              <div className="image-counter">04 / 12</div>
            </div>
            <div className="demo-info">
              <span className="micro-label">DESTINATION</span>
              <h2>Côte amalfitaine</h2>
              <p>Italie · La Dolce Vita</p>
              <div className="demo-score">
                <span style={{ width: '68%' }} />
                <b>68% SMASH</b>
              </div>
            </div>
          </div>
          <div className="choice-row">
            <button className="pass-choice">
              ✕ <span>PASS</span>
            </button>
            <button className="smash-choice">
              ♥ <span>SMASH</span>
            </button>
          </div>
          <span className="float-note note-one">CHOISIS VITE !</span>
          <span className="float-note note-two">PAS DE RETOUR ↘</span>
        </div>
      </section>
      <section className="ticker" aria-hidden="true">
        <div>
          SMASH <i>◆</i> PASS <i>◆</i> PARTAGE <i>◆</i> RECOMMENCE <i>◆</i> SMASH <i>◆</i> PASS
        </div>
      </section>
      <section className="how-section">
        <div className="section-heading">
          <span className="eyebrow">Comment ça marche</span>
          <h2>
            Trois étapes.
            <br />
            Des heures de débat.
          </h2>
        </div>
        <div className="steps">
          <article>
            <span>01</span>
            <div className="step-icon">＋</div>
            <h3>Crée ta playlist</h3>
            <p>
              Ajoute tes images, un titre et une description. Publique ou privée, c’est toi qui
              décides.
            </p>
          </article>
          <article>
            <span>02</span>
            <div className="step-icon">↗</div>
            <h3>Partage le lien</h3>
            <p>
              Envoie-la sur Discord, dans ton groupe ou à toute ta communauté. Aucun compte requis
              pour voter.
            </p>
          </article>
          <article>
            <span>03</span>
            <div className="step-icon">♥</div>
            <h3>Découvre les résultats</h3>
            <p>
              Chaque vote compte. Observe les tendances et découvre les favoris de ton entourage.
            </p>
          </article>
        </div>
      </section>
      <section className="featured-section">
        <div className="featured-head">
          <div>
            <span className="eyebrow">À toi de jouer</span>
            <h2>
              Ils attendent
              <br />
              ton verdict.
            </h2>
          </div>
          <Link href="/explore" className="outline-button">
            Tout explorer <span>→</span>
          </Link>
        </div>
        <div className="playlist-grid">
          {cards.map((card, index) => (
            <article className={`playlist-card accent-${card.accent}`} key={card.id}>
              <Link href={card.slug ? `/p/${card.slug}` : '/auth/discord'}>
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
                    <span>{card.plays ? `${card.plays} parties` : 'Nouveau'}</span>
                    <strong>JOUER ↗</strong>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="seo-intro">
        <div className="seo-intro-lead">
          <span className="eyebrow">
            <i /> Un jeu simple, mille sujets
          </span>
          <h2>
            Le jeu Smash or Pass,
            <br />
            <em>version créative.</em>
          </h2>
        </div>
        <div className="seo-intro-copy">
          <p>
            <strong>Pass or Smash</strong> est un jeu de choix en ligne gratuit : une image
            apparaît, tu donnes ton avis en un clic, puis tu passes à la suivante. Crée un quiz
            photo sur les voyages, la cuisine, le cinéma, le gaming, la mode ou n’importe quel sujet
            qui anime ta communauté.
          </p>
          <p>
            Aucun téléchargement n’est nécessaire et les participants peuvent voter sans créer de
            compte. À la fin, les résultats révèlent les favoris du groupe et lancent les débats.
            C’est rapide à créer, facile à partager sur Discord et amusant à jouer entre amis ou en
            communauté.
          </p>
          <Link href="/jeu-smash-or-pass" className="outline-button">
            Découvrir le jeu <span>→</span>
          </Link>
        </div>
      </section>
      <section className="home-faq" aria-labelledby="faq-title">
        <div>
          <span className="eyebrow">Questions fréquentes</span>
          <h2 id="faq-title">
            Avant de
            <br />
            te lancer.
          </h2>
        </div>
        <div className="faq-list">
          <details open>
            <summary>Le jeu Smash or Pass est-il gratuit ?</summary>
            <p>
              Oui. Tu peux créer, partager et jouer gratuitement, directement depuis ton navigateur.
            </p>
          </details>
          <details>
            <summary>Faut-il un compte pour voter ?</summary>
            <p>
              Non. Les joueurs ouvrent simplement ton lien et commencent à choisir entre Pass et
              Smash.
            </p>
          </details>
          <details>
            <summary>Quels thèmes peut-on utiliser ?</summary>
            <p>
              Presque tous : nourriture, destinations, personnages, objets, looks, jeux vidéo ou
              créations originales, dans le respect de chacun.
            </p>
          </details>
        </div>
      </section>
      <section className="final-cta">
        <span className="eyebrow">Prêt à semer le chaos ?</span>
        <h2>
          Crée. Partage.
          <br />
          <em>Regarde-les hésiter.</em>
        </h2>
        <a href="/auth/discord" className="button button-dark">
          Créer avec Discord <span>↗</span>
        </a>
      </section>
    </>
  )
}
