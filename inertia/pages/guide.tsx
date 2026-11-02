/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Link } from '@inertiajs/react'
import Seo from '~/components/seo'

const guides = {
  'creer-smash-or-pass': {
    title: 'Comment créer un Smash or Pass personnalisé ?',
    description:
      'Crée gratuitement ton Smash or Pass avec tes images : prépare une playlist, choisis sa visibilité et partage le lien avec tes amis.',
    intro:
      'Sur Pass or Smash, tu peux créer gratuitement un jeu avec tes propres images. Chaque participant choisit Smash ou Pass, puis découvre les résultats. Un compte est nécessaire pour créer la playlist ; tes amis peuvent voter sans compte.',
    sections: [
      [
        'Prépare un thème et tes images',
        'Choisis une question commune à toutes tes propositions : quels plats goûter, quelles destinations visiter ou quelles voitures essayer ? Prévois des images que tu as le droit de partager et des légendes qui permettent de comprendre chaque choix.',
      ],
      [
        'Crée ta playlist',
        'Connecte-toi, ouvre la création de playlist et renseigne un titre précis, une description et tes images. Donne un nom à chaque proposition. Mets les choix les plus faciles au début pour aider ton groupe à entrer dans le jeu.',
      ],
      [
        'Choisis la visibilité et partage',
        'Publie ta playlist pour permettre à tes amis de jouer depuis son lien. Une playlist privée est réservée à son créateur : elle sert à préparer ton jeu avant de le rendre public. Utilise uniquement des images adaptées à une diffusion publique.',
      ],
      [
        'Compare les choix du groupe',
        'Envoie le lien à tes amis. Chacun joue dans son navigateur sans installation et sans compte pour voter. À la fin de la partie, compare les résultats et discutez des propositions qui divisent le groupe.',
      ],
    ],
  },
  'smash-or-pass-discord': {
    title: 'Comment jouer à Smash or Pass sur Discord ?',
    description:
      'Organise une partie de Smash or Pass sur Discord : partage une playlist, joue avec tes amis dans le navigateur et compare les résultats.',
    intro:
      'Pour jouer sur Discord, partage simplement le lien d’une playlist Pass or Smash dans un salon. Les participants ouvrent le jeu dans leur navigateur et votent sans compte. Vous pouvez rester en vocal pour commenter les choix.',
    sections: [
      [
        'Choisissez une playlist ensemble',
        'Partez d’un sujet qui parle au groupe : snacks, voyages, jeux vidéo ou objets insolites. Explore les playlists publiques ou crée une sélection adaptée aux goûts de ton serveur.',
      ],
      [
        'Partage le lien dans un salon',
        'Copie le lien de la playlist et colle-le dans le salon choisi. Précise le thème et invite les participants à ouvrir le lien. Le jeu se déroule sur Pass or Smash, depuis un ordinateur ou un mobile.',
      ],
      [
        'Anime la partie en vocal',
        'Pour une partie commune, attendez-vous à chaque proposition avant de voter. Tu peux aussi partager ton écran pour commenter les images, pendant que chacun vote sur son propre appareil. Cette organisation est libre : le site ne synchronise pas automatiquement vos parties.',
      ],
      [
        'Comparez vos préférences',
        'À la fin, regardez les résultats de la playlist. Les scores reflètent les votes de la communauté et peuvent inclure des personnes extérieures au serveur. Crée une playlist publique dédiée et partage son lien à ton groupe pour organiser votre partie.',
      ],
    ],
  },
  'idees-smash-or-pass': {
    title: 'Idées de thèmes Smash or Pass pour jouer entre amis',
    description:
      'Trouve un thème pour ton Smash or Pass : plats, glaces, voitures ou destinations. Découvre des playlists et prépare ton jeu entre amis.',
    intro:
      'Un bon thème de Smash or Pass pose une question simple et laisse de la place aux désaccords. Choisis des propositions reconnaissables, varie les styles et adapte les images à ton groupe.',
    sections: [
      [
        'Cuisine : qu’est-ce que tu goûterais ?',
        'Glaces, pizzas, petits déjeuners ou plats français : demande à chacun ce qu’il aimerait manger. Mélange valeurs sûres et saveurs qui divisent. Comparez vos envies plutôt que de présenter les votes comme un classement gastronomique.',
      ],
      [
        'Voyages : où partirais-tu ?',
        'Propose des villes européennes, des plages ou des destinations de rêve. Une question précise, comme « Tu y passerais un week-end ? », rend les choix plus faciles à comparer.',
      ],
      [
        'Voitures et objets : lequel choisirais-tu ?',
        'Voitures iconiques, sneakers ou montres : confronte des styles différents. Invite les joueurs à choisir selon leurs goûts, sans confondre popularité et qualité technique.',
      ],
      [
        'Crée une sélection pour ton groupe',
        'Commence par une dizaine de propositions pour une partie courte. Utilise des images lisibles sur mobile, nomme les éléments et annonce la règle avant de partager. Évite les photos privées et respecte les personnes représentées.',
      ],
    ],
  },
}
export default function Guide({ guide }: { guide: keyof typeof guides }) {
  const content = guides[guide]
  return (
    <>
      <Seo title={content.title} description={content.description} path={`/${guide}`} />
      <article className="about-page">
        <header className="builder-head">
          <span className="eyebrow">Le guide Pass or Smash</span>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
        </header>
        {content.sections.map(([title, text], index) => (
          <section className="article-section" key={title}>
            <span className="article-number">0{index + 1}</span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </section>
        ))}
        <section className="article-section">
          <span className="article-number">↗</span>
          <div>
            <h2>Des playlists pour commencer</h2>
            <ul>
              <li>
                <Link href="/p/Glaces">Glaces : quelles saveurs choisirais-tu ?</Link>
              </li>
              <li>
                <Link href="/p/Voitures-iconiques">
                  Voitures iconiques : lesquelles valides-tu ?
                </Link>
              </li>
              <li>
                <Link href="/p/Destinations-de-reve">Destinations de rêve : où partirais-tu ?</Link>
              </li>
            </ul>
            <Link href="/explore" className="outline-button">
              Explorer les playlists
            </Link>
          </div>
        </section>
        <aside className="article-cta">
          <h2>Prépare ta prochaine partie.</h2>
          <a href="/playlists/create" className="button button-primary">
            Créer ma playlist
          </a>
          <Link href="/jeu-smash-or-pass" className="text-link">
            Lire les règles
          </Link>
        </aside>
        <nav className="article-nav" aria-label="Autres guides">
          {Object.entries(guides)
            .filter(([slug]) => slug !== guide)
            .map(([slug, value]) => (
              <Link key={slug} href={`/${slug}`}>
                {value.title}
              </Link>
            ))}
        </nav>
      </article>
    </>
  )
}
