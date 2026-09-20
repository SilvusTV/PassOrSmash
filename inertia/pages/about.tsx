/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Link } from '@inertiajs/react'
import Seo from '~/components/seo'

const faq = [
  {
    question: 'Que veut dire Smash or Pass ?',
    answer:
      'Smash signifie que tu valides une proposition ; Pass signifie que tu préfères passer. Sur Pass or Smash, ce choix sert à donner un avis ludique sur une image, un objet, une destination ou une idée.',
  },
  {
    question: 'Comment jouer à Smash or Pass en ligne ?',
    answer:
      'Ouvre une playlist, observe chaque image et choisis Pass ou Smash. À la fin du jeu, tu découvres les résultats et les tendances de la communauté.',
  },
  {
    question: 'Comment créer son propre quiz photo ?',
    answer:
      'Connecte-toi avec Discord, ajoute un titre, une description et tes images, puis partage le lien de ta playlist. Les autres joueurs n’ont pas besoin de compte pour participer.',
  },
  {
    question: 'Peut-on jouer entre amis ou sur Discord ?',
    answer:
      'Oui. Le jeu est pensé pour être partagé dans une conversation, un serveur Discord, un stream ou un groupe d’amis, sur mobile comme sur ordinateur.',
  },
]

export default function About() {
  return (
    <>
      <Seo
        title="Qu’est-ce que le jeu Smash or Pass ?"
        description="Découvre les règles de Smash or Pass, comment jouer en ligne et créer gratuitement ton propre quiz photo à partager avec tes amis ou sur Discord."
        path="/jeu-smash-or-pass"
        type="article"
        structuredData={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Article',
              'headline': 'Qu’est-ce que le jeu Smash or Pass ?',
              'description': 'Règles, idées et conseils pour jouer à Smash or Pass en ligne.',
              'inLanguage': 'fr-FR',
              'mainEntityOfPage': 'https://passorsmash.fr/jeu-smash-or-pass',
              'publisher': { '@type': 'Organization', 'name': 'Pass or Smash' },
            },
            {
              '@type': 'FAQPage',
              'mainEntity': faq.map((item) => ({
                '@type': 'Question',
                'name': item.question,
                'acceptedAnswer': { '@type': 'Answer', 'text': item.answer },
              })),
            },
          ],
        }}
      />

      <article className="about-page">
        <header className="about-hero">
          <div>
            <span className="eyebrow">
              <i /> Le guide complet
            </span>
            <h1>
              Qu’est-ce que
              <br />
              le jeu{' '}
              <em>
                Smash
                <br />
                or Pass&nbsp;?
              </em>
            </h1>
          </div>
          <div className="about-hero-card">
            <span className="micro-label">LA RÈGLE EN 10 SECONDES</span>
            <p>Une image. Deux choix. Ton verdict.</p>
            <div>
              <b>✕ PASS</b>
              <b>♥ SMASH</b>
            </div>
          </div>
        </header>

        <nav className="article-nav" aria-label="Sommaire de l’article">
          <span>Dans ce guide</span>
          <a href="#definition">Définition</a>
          <a href="#regles">Règles du jeu</a>
          <a href="#idees">Idées de thèmes</a>
          <a href="#creer">Créer un jeu</a>
          <a href="#faq">FAQ</a>
        </nav>

        <section className="article-section" id="definition">
          <span className="article-number">01</span>
          <div>
            <span className="eyebrow">La définition</span>
            <h2>Smash or Pass : un jeu de choix rapide et spontané</h2>
            <p className="article-lead">
              Le principe de <strong>Smash or Pass</strong> est volontairement simple : face à une
              proposition, chaque joueur choisit de la valider — <em>Smash</em> — ou de passer —{' '}
              <em>Pass</em>.
            </p>
            <p>
              Notre version transforme ce concept en un <strong>quiz photo en ligne</strong> créatif
              et personnalisable. Ici, le jeu ne se limite pas aux personnes : on peut comparer des
              plats, des destinations de voyage, des personnages fictifs, des tenues, des voitures,
              des jeux vidéo, des objets design ou des idées complètement insolites.
            </p>
            <p>
              Cette mécanique binaire rend le jeu immédiat. Il n’y a ni longue règle à apprendre, ni
              application à installer. Chaque décision alimente les résultats de la playlist et
              permet de comparer son avis avec celui des autres participants.
            </p>
          </div>
        </section>

        <section className="article-section article-dark" id="regles">
          <span className="article-number">02</span>
          <div>
            <span className="eyebrow">Comment jouer</span>
            <h2>Les règles de Smash or Pass en trois étapes</h2>
            <div className="rule-grid">
              <article>
                <b>1</b>
                <h3>Regarde</h3>
                <p>
                  Une image et sa légende s’affichent à l’écran. Prends le temps de découvrir la
                  proposition.
                </p>
              </article>
              <article>
                <b>2</b>
                <h3>Choisis</h3>
                <p>
                  Clique sur <strong>Smash</strong> si tu valides, ou sur <strong>Pass</strong> si
                  ce n’est pas ton choix.
                </p>
              </article>
              <article>
                <b>3</b>
                <h3>Compare</h3>
                <p>
                  À la fin, consulte le classement et découvre les préférences de tous les joueurs.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="article-section" id="idees">
          <span className="article-number">03</span>
          <div>
            <span className="eyebrow">Trouver l’inspiration</span>
            <h2>Des idées de Smash or Pass pour tous les groupes</h2>
            <p className="article-lead">
              Le meilleur thème est celui qui parle à ton groupe. Plus les choix sont difficiles,
              plus le débat est amusant.
            </p>
            <div className="topic-cloud" aria-label="Exemples de thèmes">
              <span>🍕 Nourriture</span>
              <span>✈️ Voyages</span>
              <span>🎮 Jeux vidéo</span>
              <span>🎬 Films & séries</span>
              <span>👟 Mode</span>
              <span>🚗 Voitures</span>
              <span>🎵 Musique</span>
              <span>🏠 Design</span>
              <span>🦸 Personnages</span>
            </div>
            <p>
              Pour une soirée entre amis, crée une sélection courte et rythmée. Pour une communauté
              Discord ou un stream, choisis un thème reconnaissable et ajoute suffisamment d’images
              pour faire émerger un vrai classement. Utilise uniquement des contenus que tu as le
              droit de partager et garde toujours le jeu respectueux.
            </p>
          </div>
        </section>

        <section className="article-section create-guide" id="creer">
          <span className="article-number">04</span>
          <div>
            <span className="eyebrow">À toi de jouer</span>
            <h2>Créer son jeu Smash or Pass gratuitement</h2>
            <p className="article-lead">
              Donne un titre clair à ta playlist, ajoute une description, importe tes images puis
              ordonne-les pour raconter une histoire ou augmenter progressivement la difficulté.
            </p>
            <ul>
              <li>
                <b>Personnalise</b> le thème, les images et les légendes.
              </li>
              <li>
                <b>Publie</b> la playlist pour la rendre accessible avec un simple lien.
              </li>
              <li>
                <b>Partage</b> sur Discord, dans un groupe ou avec ta communauté.
              </li>
              <li>
                <b>Analyse</b> les votes et découvre les propositions les plus populaires.
              </li>
            </ul>
            <a href="/auth/discord" className="button button-primary">
              Créer mon Smash or Pass <span>↗</span>
            </a>
          </div>
        </section>

        <section className="about-faq" id="faq">
          <div>
            <span className="eyebrow">FAQ</span>
            <h2>
              Tout savoir
              <br />
              avant de jouer.
            </h2>
          </div>
          <div className="faq-list">
            {faq.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <aside className="article-cta">
          <span className="eyebrow">Prêt à trancher ?</span>
          <h2>
            Ton jeu. Tes images.
            <br />
            <em>Leurs verdicts.</em>
          </h2>
          <div>
            <a href="/auth/discord" className="button button-dark">
              Créer une playlist <span>↗</span>
            </a>
            <Link href="/explore" className="text-link">
              Jouer maintenant <span>→</span>
            </Link>
          </div>
        </aside>
      </article>
    </>
  )
}
