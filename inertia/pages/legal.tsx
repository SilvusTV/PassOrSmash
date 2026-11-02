/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Head, Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

const contact = <a href="mailto:contact@passorsmash.fr">contact@passorsmash.fr</a>
const pages = {
  mentions: { title: 'Mentions légales', path: '/mentions-legales' },
  terms: { title: 'Conditions générales d’utilisation', path: '/cgu' },
  privacy: { title: 'Confidentialité', path: '/confidentialite' },
}
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}
export default function Legal({ document }: { document: keyof typeof pages }) {
  const current = pages[document]
  return (
    <article className="legal-page">
      <Head title={current.title} />
      <header>
        <span className="eyebrow">PassOrSmash · Les règles du jeu</span>
        <h1>
          {current.title}
          <span>.</span>
        </h1>
        <p>Dernière mise à jour : 2 novembre 2026</p>
      </header>
      <nav className="legal-nav" aria-label="Informations légales">
        {Object.entries(pages).map(([key, page]) => (
          <Link key={key} href={page.path} aria-current={document === key ? 'page' : undefined}>
            {page.title}
          </Link>
        ))}
      </nav>
      <div className="legal-body">
        {document === 'mentions' && (
          <>
            <Section id="editeur" title="01. Éditeur et contact">
              <p>
                PassOrSmash est édité à titre non professionnel par Hugo COMBE, particulier,
                également directeur de la publication et responsable du traitement des données
                personnelles.
              </p>
              <p>Contact pour le site, la modération et les données personnelles : {contact}.</p>
              <p>
                Les coordonnées personnelles de l’éditeur ne sont pas publiées. Le régime applicable
                aux éditeurs non professionnels permet de préserver ces coordonnées à condition
                d’avoir communiqué à l’hébergeur les éléments d’identification requis.
              </p>
            </Section>
            <Section id="hebergeur" title="02. Hébergement">
              <p>
                Le site est hébergé en France par OVH SAS, 2 rue Kellermann, 59100 Roubaix, France.
              </p>
              <p>
                Téléphone : 1007 depuis la France. Site :{' '}
                <a href="https://www.ovhcloud.com/fr/">ovhcloud.com</a>.
              </p>
              <p>
                La localisation de cet hébergement ne signifie pas que tous les services tiers
                utilisés par le site traitent leurs données exclusivement en France.
              </p>
            </Section>
            <Section id="contenus" title="03. Contenus et droits">
              <p>
                Les créateurs restent responsables des textes, images et playlists qu’ils proposent.
                Ils doivent disposer des droits nécessaires et respecter la vie privée, le droit à
                l’image et les droits de propriété intellectuelle des tiers.
              </p>
              <p>
                Les contenus des utilisateurs ne constituent pas une prise de position de l’éditeur.
                L’accès administratif ou une intervention de modération ne vaut pas validation
                juridique de chaque contenu. Les responsabilités de chacun restent soumises aux
                dispositions légales applicables.
              </p>
              <p>
                La structure, les textes originaux et les éléments graphiques propres au site sont
                protégés par les droits applicables. Aucun droit sur les images de tiers n’est
                revendiqué du seul fait de leur hébergement.
              </p>
            </Section>
            <Section id="signalement" title="04. Signaler un contenu">
              <p>
                Écris à {contact} avec le lien précis de la playlist, l’élément concerné, les motifs
                du signalement et les informations utiles pour comprendre l’atteinte alléguée. Pour
                une demande relative à tes droits sur une image, indique les éléments permettant de
                les établir.
              </p>
              <p>
                Les signalements sont examinés par l’éditeur. Pour contester une décision, utilise
                le même contact en indiquant la décision et tes observations. En cas de danger
                immédiat, contacte les services d’urgence compétents.
              </p>
            </Section>
          </>
        )}
        {document === 'terms' && (
          <>
            <div className="legal-callout">
              <strong>Créer une playlist engage son créateur.</strong>
              <p>
                L’administration peut consulter toutes les playlists, publiques comme privées,
                retirer un contenu contraire aux règles et restreindre ou suspendre un compte.
              </p>
            </div>
            <Section id="service" title="01. Le service">
              <p>
                PassOrSmash permet de créer des playlists d’images, de les partager et de voter «
                Pass » ou « Smash ». Les résultats reflètent les choix enregistrés ; ils ne
                constituent ni une évaluation objective ni un avis de l’éditeur. Une partie est
                comptée dès un premier vote, même sans terminer la playlist.
              </p>
              <p>
                Les présentes règles s’appliquent à la création et au partage de contenus ainsi
                qu’aux votes. L’éditeur peut faire évoluer les fonctionnalités ou interrompre
                temporairement le service pour sa maintenance et sa sécurité.
              </p>
            </Section>
            <Section id="compte" title="02. Ton compte">
              <p>
                Tu fournis des informations exactes et protèges tes moyens de connexion. Ne partage
                pas ton compte et signale toute utilisation non autorisée. Les connexions Discord et
                Google sont également soumises aux règles de leurs fournisseurs. Un mineur doit
                disposer des autorisations nécessaires à son utilisation du service selon le droit
                applicable.
              </p>
            </Section>
            <Section id="responsabilite" title="03. Responsabilité des créateurs">
              <p>
                Tu es responsable des contenus que tu ajoutes, de leur présentation et de leur
                partage. Tu dois t’assurer d’avoir les droits et autorisations nécessaires,
                notamment pour les images représentant des personnes. Une image accessible sur
                Internet n’est pas nécessairement libre de droits.
              </p>
              <p>
                Les playlists des utilisateurs sont créées sous leur responsabilité et ne sont pas
                présentées comme des contenus approuvés par Hugo COMBE. L’éditeur ne garantit ni
                leur exactitude ni la détention des droits par leur créateur. Cette répartition ne
                supprime pas les obligations légales de l’éditeur, notamment lorsqu’un contenu
                illicite est porté à sa connaissance.
              </p>
            </Section>
            <Section id="interdits" title="04. Ce qui n’a pas sa place ici">
              <p>
                Sont interdits les contenus illicites, haineux, discriminatoires, diffamatoires,
                harcelants, menaçants, faisant l’apologie de violences ou portant atteinte à la
                dignité, à la vie privée ou aux droits d’autrui. Sont également interdits les
                contenus sexuels explicites, les images intimes diffusées sans accord, toute
                sexualisation de mineurs, la divulgation de données personnelles sans droit, les
                images volées et les liens malveillants.
              </p>
              <p>
                Ne crée pas de playlists visant à humilier des personnes identifiables ni à
                organiser du harcèlement. Le spam, la manipulation automatisée des votes et le
                contournement d’une sanction sont interdits.
              </p>
            </Section>
            <Section id="moderation" title="05. Modération : toutes les playlists sont concernées">
              <p>
                L’éditeur dispose d’un accès administratif à l’ensemble des playlists et de leurs
                éléments, y compris lorsqu’elles sont privées, pour assurer la sécurité, examiner
                les signalements et appliquer les présentes règles. Une playlist privée n’est pas
                publiée dans Explorer et son accès dans le site est limité à son créateur et aux
                administrateurs ; elle n’est pas invisible pour l’administration.
              </p>
              <p>
                Les médias importés peuvent disposer d’une adresse directe accessible indépendamment
                de la playlist. N’utilise pas ce service comme un stockage de documents
                confidentiels.
              </p>
              <p>
                Il n’existe pas de garantie de contrôle préalable ou de surveillance permanente de
                chaque playlist. L’éditeur peut examiner les contenus à leur création,
                ultérieurement ou à la suite d’un signalement.
              </p>
              <p>
                Si un contenu est illicite, inapproprié au service ou contraire à ces règles,
                l’éditeur peut le retirer, supprimer une playlist, limiter l’accès à certaines
                fonctionnalités ou suspendre un compte. La mesure est adaptée à la gravité, au
                contexte et aux éventuelles récidives. Une action immédiate peut être nécessaire
                pour protéger des personnes ou respecter une obligation légale.
              </p>
              <p>
                Une décision peut être contestée auprès de {contact}. L’éditeur examine les
                observations communiquées et fournit les informations sur la décision lorsque le
                droit applicable l’exige.
              </p>
            </Section>
            <Section id="suppression" title="06. Effets d’une suppression">
              <p>
                La suppression d’une playlist ou d’un élément peut supprimer les votes associés et
                modifier les statistiques. Le service ne remplace pas une sauvegarde de tes
                fichiers. Une suspension bloque l’accès au compte sans effacer automatiquement ses
                contenus ; ceux-ci peuvent faire l’objet d’une décision de modération distincte.
              </p>
              <p>
                Pour demander la suppression de ton compte ou exercer tes droits sur tes données,
                consulte la <Link href="/confidentialite">politique de confidentialité</Link>.
              </p>
            </Section>
            <Section id="droit" title="07. Droit applicable et contact">
              <p>
                Les présentes conditions sont soumises au droit français, sous réserve des règles
                impératives applicables, notamment celles protégeant les utilisateurs. Les
                juridictions compétentes sont déterminées par la loi. Pour toute question ou
                tentative de résolution amiable : {contact}.
              </p>
            </Section>
          </>
        )}
        {document === 'privacy' && (
          <>
            <div className="legal-callout">
              <strong>Privée pour les visiteurs, accessible à l’administration.</strong>
              <p>
                La visibilité d’une playlist ne supprime pas l’accès administratif nécessaire à la
                gestion du service et à la modération.
              </p>
            </div>
            <Section id="responsable" title="01. Qui traite tes données ?">
              <p>
                Le responsable du traitement est Hugo COMBE, éditeur particulier de PassOrSmash.
                Pour toute question ou demande relative à tes données : {contact}.
              </p>
            </Section>
            <Section id="donnees" title="02. Données utilisées et finalités">
              <ul>
                <li>
                  <strong>Compte et connexion :</strong> adresse e-mail, nom affiché, pseudonyme,
                  avatar, identifiants Discord ou Google lorsque ces services sont utilisés, dates
                  de création et de mise à jour. Le mot de passe choisi par e-mail est conservé sous
                  forme hachée. Finalité : créer et sécuriser le compte ; base légale : exécution du
                  service demandé.
                </li>
                <li>
                  <strong>Playlists et votes :</strong> titres, descriptions, images ou liens,
                  visibilité, ordre des éléments, votes, identifiant de navigateur, identifiant de
                  partie et, si tu es connecté, rattachement au compte. Finalités : jouer, gérer tes
                  contenus, prévenir les doubles votes dans une partie et calculer les résultats ;
                  base légale : exécution du service demandé.
                </li>
                <li>
                  <strong>Sécurité et modération :</strong> signalements, motifs de suspension,
                  statut du compte et traces des actions administratives. Finalités : protéger les
                  personnes et le service, traiter les contestations ; base légale : intérêt
                  légitime à assurer un service sûr et, lorsqu’elles s’appliquent, obligations
                  légales.
                </li>
                <li>
                  <strong>Mesure d’audience facultative :</strong> si Google Analytics est activé,
                  données de navigation et événements de jeu transmis après ton accord. Base légale
                  : consentement, retirable à tout moment.
                </li>
              </ul>
              <p>
                Les données de connexion requises sont nécessaires à la création du compte ; sans
                elles, cette fonctionnalité ne peut pas être fournie. Les votes peuvent être
                effectués sans créer de compte. Aucune décision de sanction fondée exclusivement sur
                un profilage automatisé n’est prévue dans le fonctionnement décrit ici.
              </p>
            </Section>
            <Section id="destinataires" title="03. Qui peut y accéder ?">
              <p>
                L’éditeur et les administrateurs habilités peuvent accéder aux données nécessaires à
                leurs missions, dont toutes les playlists publiques et privées. Les visiteurs ont
                accès aux playlists publiques et aux résultats agrégés ; l’adresse e-mail du compte
                n’est pas affichée sur les cartes publiques.
              </p>
              <p>
                OVH fournit l’hébergement du site en France. Les fournisseurs de connexion Google et
                Discord traitent les échanges d’authentification selon leurs propres politiques. Les
                images chargées depuis une adresse externe et les polices fournies par Google Fonts
                impliquent des connexions à leurs fournisseurs ; ceux-ci peuvent notamment recevoir
                l’adresse IP et des informations techniques du navigateur. Les médias importés ont
                des adresses directes et ne doivent pas contenir de données confidentielles.
              </p>
              <p>
                Google Analytics, s’il est configuré et accepté, constitue un service tiers
                supplémentaire. Ces fournisseurs peuvent traiter certaines données hors de l’Union
                européenne ; les garanties et conditions applicables sont décrites dans leurs
                politiques respectives : <a href="https://policies.google.com/privacy">Google</a> et{' '}
                <a href="https://discord.com/privacy">Discord</a>. L’hébergement français du site ne
                garantit pas une localisation française de tous ces traitements.
              </p>
              <p>
                Des données peuvent être communiquées aux autorités habilitées en réponse à une
                obligation légale.
              </p>
            </Section>
            <Section id="conservation" title="04. Durées de conservation">
              <p>
                Les informations du compte et les contenus sont conservés pendant leur utilisation
                dans le service, jusqu’à leur suppression ou au traitement d’une demande
                d’effacement recevable. Les votes et statistiques restent rattachés aux éléments
                encore présents ; ils peuvent disparaître lors de leur suppression. L’expiration
                d’un cookie ne supprime pas automatiquement les votes déjà enregistrés.
              </p>
              <p>
                Les données nécessaires à la gestion d’un signalement, à la justification d’une
                décision ou à la défense d’un droit peuvent être conservées séparément le temps
                nécessaire à cette finalité, à la résolution du dossier et aux délais légaux
                applicables. Les données présentes dans les sauvegardes suivent le cycle de
                renouvellement des sauvegardes ; une suppression ne signifie pas leur effacement
                instantané de toutes les copies techniques.
              </p>
            </Section>
            <Section id="cookies" title="05. Cookies et préférences">
              <ul>
                <li>
                  <strong>Session :</strong> cookie <code>adonis-session</code>, durée configurée de
                  deux heures, pour la connexion et la sécurité ; protection CSRF associée.
                </li>
                <li>
                  <strong>Votes :</strong> cookie <code>pos_visitor</code>, jusqu’à un an, pour
                  reconnaître le navigateur. Une nouvelle partie possède un identifiant distinct ;
                  plusieurs parties peuvent être enregistrées depuis ce navigateur.
                </li>
                <li>
                  <strong>Apparence :</strong> préférence <code>pos_theme</code> dans le stockage
                  local, conservée jusqu’à modification ou effacement du stockage.
                </li>
                <li>
                  <strong>Audience :</strong> choix enregistré localement sous{' '}
                  <code>passorsmash_analytics_consent</code>. Le suivi Google Analytics est
                  facultatif et n’est chargé qu’après acceptation. Les cookies du fournisseur,
                  lorsqu’il est activé, suivent sa configuration.
                </li>
              </ul>
              <p>
                Les traceurs nécessaires au fonctionnement et les préférences demandées par
                l’utilisateur sont distincts de la mesure d’audience facultative. Le bouton « Gérer
                les cookies » en bas de chaque page permet de revoir ton choix. Le refus de
                l’audience ne bloque pas les playlists ni les votes.
              </p>
            </Section>
            <Section id="droits" title="06. Tes droits">
              <p>
                Selon les conditions prévues par le RGPD, tu peux demander l’accès, la
                rectification, l’effacement, la limitation et la portabilité de tes données,
                t’opposer aux traitements fondés sur l’intérêt légitime et retirer ton consentement
                aux traitements facultatifs sans effet rétroactif sur leur licéité.
              </p>
              <p>
                Écris à {contact} en précisant ta demande et le compte ou les contenus concernés.
                Une vérification d’identité proportionnée peut être demandée en cas de doute. Une
                réponse est apportée en principe dans un délai d’un mois, avec prolongation possible
                dans les conditions légales.
              </p>
              <p>
                Tu peux également saisir la <a href="https://www.cnil.fr/fr/plaintes">CNIL</a>. La
                suppression d’une playlist dans le site ne garantit pas le retrait de copies déjà
                réalisées par des tiers.
              </p>
            </Section>
          </>
        )}
      </div>
      <aside className="legal-contact">
        <span className="eyebrow">Une question, un signalement ?</span>
        <h2>On en parle.</h2>
        <p>{contact}</p>
      </aside>
    </article>
  )
}
