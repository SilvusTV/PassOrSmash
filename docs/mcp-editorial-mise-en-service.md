# MCP éditorial : implémentation et mise en service

**Mise à jour — connexion Discord intégrée :** le site fournit maintenant l’autorisation OAuth nécessaire au MCP. Pour l’ajouter à votre client, suivre [le guide de connexion Discord](mcp-discord-connexion.md). Les instructions de fournisseur externe ci-dessous ne concernent que ce mode optionnel ; laisser issuer et JWKS vides pour le mode intégré.

## État du développement

Le serveur distant `/mcp`, les 19 outils du cahier des charges, les services partagés, le studio `/admin/editorial`, les propositions privées, les révisions et la publication humaine atomique sont implémentés. Les tâches sont conservées dans PostgreSQL et exécutées par `node ace editorial:tick`. Aucun outil MCP ne publie, ne refuse, ne rouvre, ni ne modifie les réglages.

L’automatisation est désactivée par défaut. Aucun fournisseur de génération, destinataire ou administrateur de production n’a été configuré. L’autorisation MCP intégrée réutilise Discord et crée ses clés de signature persistantes. Les migrations doivent être appliquées dans l’environnement cible au déploiement. Le branchement avec le client final et un essai réel des fournisseurs restent requis avant activation.

## Choix techniques

- SDK officiel épinglé : `@modelcontextprotocol/server` **2.4.0**, adaptateur Node **2.1.2**, Zod **4.6.7**. Les versions des deux paquets MCP ne sont pas identiques dans le registre npm ; leurs dépendances sont verrouillées dans `package-lock.json`.
- Transport Streamable HTTP via `createMcpHandler` et `toNodeHandler`, sans session contenant le workflow. Le SDK gère le protocole et les erreurs de transport.
- Référence de compatibilité initiale : client Streamable HTTP parlant **2025-11-25**, testé en mémoire via le SDK ; le gestionnaire accepte aussi la version **2026-07-28** prise en charge par le SDK. Client de recette visé : [MCP Inspector](https://github.com/modelcontextprotocol/inspector). La connexion depuis un client final n’a pas encore été validée.
- Autorisation : serveur intégré `oidc-provider` avec connexion Discord et consentement administrateur, flux Authorization Code avec PKCE S256. Un fournisseur OAuth externe reste optionnel. Métadonnées RFC 9728 sur `/.well-known/oauth-protected-resource/mcp` et à la racine.
- Planification : commande serveur appelée toutes les minutes par l’hébergeur. File durable PostgreSQL, réservation d’une tâche par verrou de ligne `FOR UPDATE SKIP LOCKED`, bail de 15 minutes avec jeton, reprises et points de progression persistants.
- Images : stockage local privé dans `tmp/editorial`, sans bucket public. Ce répertoire doit résider sur un **volume persistant partagé** entre les processus web et les workers. Ne jamais le servir directement par le proxy. Les médias passent par une route qui vérifie leur accès à chaque requête.

Références vérifiées lors de l’implémentation : [SDK TypeScript officiel](https://github.com/modelcontextprotocol/typescript-sdk), [transport HTTP](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md), [autorisation MCP 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).

## Installation et droits

1. Installer les dépendances avec `npm ci`.
2. Appliquer `node ace migration:run` dans la base cible après sauvegarde habituelle.
3. Renseigner `EDITORIAL_ADMIN_DISCORD_IDS` avec les identifiants Discord autorisés, séparés par des virgules. Une session Discord ordinaire n’accorde aucun droit éditorial. Une liste vide refuse tous les accès administrateur.
4. Se connecter au site puis ouvrir `/admin/editorial`. Le lien « Studio éditorial » apparaît pour ces administrateurs.
5. Préparer un brouillon, ajouter ses sources et éléments, enregistrer, puis importer les images avec leurs crédits et licences. Le worker doit fonctionner pour terminer les imports.
6. Vérifier les points bloquants puis soumettre. Le contenu est alors figé. Seul le bouton du tableau de bord peut approuver et publier la révision affichée. Une modification nécessite une réouverture explicite et une nouvelle soumission.

Chaque connexion et proposition appartient au compte autorisé. La V1 ne définit pas de rédaction partagée entre plusieurs comptes : un autre administrateur ne voit pas les brouillons de son collègue. Choisir comme compte de préparation celui qui examinera les propositions automatiques.

## Branchement OAuth externe optionnel

Pour la connexion Discord intégrée, utiliser [ce guide](mcp-discord-connexion.md). La procédure qui suit s’applique uniquement si vous choisissez un fournisseur externe.

Configurer chez le fournisseur OAuth :

- Un client autorisé, avec ses URI de redirection exactes et PKCE S256 obligatoire.
- Une ressource dont l’audience est exactement `https://votre-domaine/mcp`.
- Les portées `editorial:read`, `editorial:write`, `editorial:generate`.
- Des jetons d’accès JWT signés en RS256 ou ES256, avec `iss`, `aud`, `exp`, `iat`, `sub`, `scope` et `client_id` ou `azp`. Les jetons opaques ne sont pas pris en charge par cet adaptateur.
- Des métadonnées OAuth/OIDC de découverte et un endpoint JWKS HTTPS publics. L’expiration et la révocation des jetons côté fournisseur restent sous sa responsabilité.

Renseigner côté serveur :

```env
APP_URL=https://votre-domaine
MCP_OAUTH_ISSUER=https://votre-fournisseur/oauth
MCP_OAUTH_JWKS_URL=https://votre-fournisseur/keys
MCP_ALLOWED_ORIGINS=https://origine-exacte-du-client-web
```

Dans « Connexions MCP », enregistrer le `sub` et l’identifiant client obtenus auprès du fournisseur, les droits et l’autorisation locale de 30 jours. Les droits effectifs sont l’intersection entre cette autorisation et les portées du jeton. Le bouton « Révoquer » prend effet au prochain appel, même si le JWT n’a pas expiré. Réautoriser le même couple identité/client renouvelle les droits du même propriétaire.

Dans le client MCP, sélectionner Streamable HTTP et l’URL `https://votre-domaine/mcp`, puis son flux OAuth. Un client natif sans en-tête Origin est accepté ; un navigateur doit envoyer une origine explicitement autorisée. Le proxy doit conserver le Host public et terminer HTTPS. Les cookies Discord ne remplacent jamais le Bearer OAuth. Les jetons entrants ne sont jamais transmis aux fournisseurs.

La V1 suppose des clients préenregistrés auprès du fournisseur. Elle ne fournit ni inscription dynamique de clients ni fournisseur OAuth interne.

## Contrat des outils

Les noms correspondent au catalogue du cahier des charges. Les schémas exacts sont découverts par `tools/list`, avec rejet des champs inconnus, y compris dans les objets imbriqués.

- Succès : `structuredContent: { data: ... }`, accompagné d’un bloc texte JSON contenant les mêmes données métier.
- Erreur métier : résultat MCP `isError: true`, bloc texte JSON `{ code, message, tracking_id, retryable }`. Les erreurs de protocole et de schéma sont gérées par le SDK.
- Les créations prennent `idempotency_key` (8 à 120 caractères). Cela comprend la création d’un élément et les commandes de génération, d’import et de soumission. Réutiliser une clé avec une entrée différente est une erreur.
- Les modifications prennent `proposal_id` et `expected_revision`. Les éléments ont des UUID durables ; leur ordre est celui du tableau `items`.
- `create_proposal` reçoit un objet `content` ; `update_proposal` reçoit un objet `fields` partiel sans `items` ; les outils d’éléments reçoivent `item` ou `fields`. Aucun champ libre de statut, de publication ou d’approbation n’est accepté.
- `import_proposal_image` reçoit `item_id` et `provenance: { url, credit, license, license_url }` ; il rend la main avec `job_id`.
- Les listes utilisent `cursor`, `limit` (25 par défaut, maximum 50) et renvoient `items`, `next_cursor`. Les curseurs des playlists sont numériques ; ceux des propositions et tâches sont des UUID.
- `get_job` retourne l’état, l’étape (`stage`), les tentatives, le résultat disponible et l’erreur. Les points de progression intermédiaires restent privés.

Exemple de contenu incomplet accepté en brouillon :

```json
{
  "title": "Les jeux de la semaine",
  "description": "Une sélection à vérifier avant publication.",
  "category": "jeux",
  "items": [],
  "sources": [],
  "checks": []
}
```

Les contrôles bloquent une soumission sans deux éléments, sources référencées, images importées et fichiers disponibles, ou lorsqu’un point `checks` reste ouvert. Le contrôle automatique ne prouve pas la véracité d’une actualité ni les droits d’utilisation : l’examen humain des sources et licences demeure obligatoire. Les crédits sont conservés et affichés dans la page publique lors de la publication.

## Fournisseur de veille

La V1 prend en charge les flux **JSON Feed**, avec `items` comprenant `id`, `url`, `title`, `date_published` (ISO 8601 avec fuseau), et éventuellement `summary`. RSS et les moteurs de recherche nécessitent un adaptateur supplémentaire ; ne pas saisir une URL RSS dans ces réglages.

Ajouter les flux HTTPS autorisés et leur catégorie dans le studio. Les résultats restent limités aux catégories activées, à la fenêtre de fraîcheur et aux URL non proposées depuis 30 jours dans ce périmètre. Les résumés externes sont transmis comme données au fournisseur de génération. Une recherche sans résultat ne fabrique aucun sujet. Une source indisponible laisse une erreur exploitable.

## Adaptateur de génération

`EDITORIAL_GENERATION_URL` désigne un service HTTPS compatible avec le contrat ci-dessous. Il faut fournir ce service ou adapter `app/services/generation/provider.ts` au fournisseur choisi ; aucune clé d’un fournisseur IA particulier n’est présumée. Ce connecteur n’est pas directement compatible avec une API de modèle dont le format diffère.

Le serveur envoie un POST JSON, un éventuel Bearer `EDITORIAL_GENERATION_TOKEN` et `Idempotency-Key: job_id`. Le corps contient `language`, `item_count`, `topic` (titre, catégorie, extrait, source datée), et `instructions`. Le service doit traiter les données externes comme non fiables, produire uniquement du contenu structuré, et ne disposer d’aucune capacité de publication PassOrSmash. Il doit respecter les clés d’idempotence et le coût maximal convenu par appel.

Réponse HTTP 200 attendue :

```json
{
  "content": {
    "title": "Les jeux de la semaine",
    "description": "Texte en français fondé sur la source fournie.",
    "category": "jeux",
    "items": [
      {
        "title": "Jeu A",
        "description": "Présentation sourcée.",
        "source_urls": ["https://source.example/annonce"]
      },
      {
        "title": "Jeu B",
        "description": "Présentation sourcée.",
        "source_urls": ["https://source.example/annonce"]
      }
    ],
    "sources": [
      {
        "title": "Annonce officielle",
        "url": "https://source.example/annonce",
        "retrieved_at": "2026-11-01T10:00:00Z"
      }
    ],
    "checks": []
  },
  "images": [
    {
      "item_index": 0,
      "provenance": {
        "url": "https://images.example/a.png",
        "credit": "Auteur A",
        "license": "CC0",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/"
      }
    },
    {
      "item_index": 1,
      "provenance": {
        "url": "https://images.example/b.png",
        "credit": "Auteur B",
        "license": "CC0",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/"
      }
    }
  ]
}
```

Le nombre d’éléments et d’images doit égaler le nombre demandé. Une seule provenance par index est requise. Les URL sources doivent provenir du sujet collecté ; le serveur remplace les métadonnées de source par celles effectivement collectées. Le fournisseur ne peut attribuer ni identifiants d’élément ni médias existants.

Les licences admises sont `CC0`, `CC-BY-4.0`, `CC-BY-SA-4.0` et `permission`, avec un lien et un crédit obligatoires. Une licence inconnue empêche l’import ; la mention `permission` doit pointer vers une preuve contrôlable par l’administrateur. Aucune recherche d’image avec droits inconnus n’est effectuée automatiquement.

Téléchargements : HTTPS public sans port personnalisé, résolution DNS contrôlée et connexion à l’adresse vérifiée, refus des réseaux privés/réservés et des redirections, 8 Mo maximum, JPG/PNG/WebP/GIF réellement décodables, au moins 100 pixels par dimension, au plus 25 mégapixels. L’image est réencodée en PNG avec un côté maximal de 2000 pixels et sans animation.

## Notifications

Configurer un endpoint dédié dans `EDITORIAL_NOTIFICATION_URL` et, si nécessaire, `EDITORIAL_NOTIFICATION_TOKEN`. Ce service doit envoyer au seul destinataire convenu, avec la confidentialité appropriée. Le libellé du destinataire dans le studio décrit cette configuration ; il ne constitue pas un système de routage.

Le POST JSON contient `event` (`ready`, `needs_attention`, `no_topic`, `failed`), `url` vers le studio protégé, éventuellement `job_id`. L’en-tête `Idempotency-Key` contient l’identifiant durable de notification. Le destinataire doit dédupliquer cette clé et répondre HTTP 200. Un webhook qui répond 202 ou 204 nécessite un adaptateur. Les échecs se relancent indépendamment de la génération depuis la liste des tâches. Ils ne publient jamais de contenu.

## Planification et limites

Appeler sur l’hébergement, toutes les minutes, depuis le répertoire du build :

```cron
* * * * * cd /chemin/vers/passorsmash/build && node ace editorial:tick
```

Utiliser le mécanisme équivalent de l’hébergeur si cron n’est pas disponible. La commande planifie le créneau dû puis traite une seule tâche ; plusieurs processus peuvent travailler sur des tâches distinctes. Aucune requête web ni connexion MCP n’exécute de génération longue. Une recherche d’actualité directe est limitée à 45 secondes environ.

Les mardi et vendredi à 10 h sont des **valeurs proposées**, à confirmer dans le studio avant activation. Deux créneaux distincts dans `Europe/Paris` sont imposés. Une heure inexistante au printemps est décalée de la durée du saut ; lors du passage à l’heure d’hiver, seule la première occurrence est retenue. La clé persistante du créneau évite les doublons. Le rattrapage (12 heures initialement) ne retient que le dernier créneau éligible.

La pause empêche la création de nouvelles tâches planifiées. Les tâches déjà enregistrées continuent, les demandes manuelles restent possibles et la revue reste ouverte. Le compte de préparation doit être un administrateur explicitement autorisé.

Chaque tentative est bornée à environ deux minutes avec contrôle entre étapes et délais par téléchargement. Le fournisseur de génération dispose de 45 secondes par appel ; les autres téléchargements de 15 secondes plus au plus cinq secondes de DNS. Trois tentatives au maximum, avec délai croissant. Les résultats de génération et les médias vérifiés sont enregistrés entre étapes. Après une panne, un appel fournisseur commencé mais dont la réponse n’a pas été enregistrée peut être répété ; son idempotence doit être assurée par le fournisseur.

Le plafond journalier est calculé en UTC. Chaque appel réserve **avant envoi** le coût maximal configuré ; les échecs ne remboursent pas cette réservation. Le plafond et le nombre d’appels sont contrôlés sous verrou PostgreSQL. Le contrôle ne mesure pas une facture distante : configurer le coût réel maximal contractuel et les limites correspondantes chez le fournisseur. Une notification n’a aucune capacité de publication.

## Conservation et dépannage

La V1 n’exécute aucun nettoyage automatique. Politique d’exploitation : conserver au moins 90 jours les tâches terminées et propositions refusées ; conserver durablement les révisions approuvées et l’audit de publication. Toute purge ultérieure doit conserver les relations utiles à l’idempotence, les données de publication, et les médias référencés dans les propositions ou playlists. Les images orphelines après échec restent privées ; leur nettoyage doit vérifier les références avant suppression. Sauvegarder ensemble PostgreSQL et le volume de médias.

En cas d’échec, consulter l’état et l’erreur dans le studio ou `get_job`, puis l’identifiant de suivi. Corriger la configuration ou la donnée avant de relancer. Si le processus a été interrompu, le bail expire après 15 minutes. Une révision obsolète se résout en rechargeant la proposition. Une revue figée se modifie après « Rouvrir pour modification ». Une licence manquante se résout en remplaçant le média ou en documentant une autorisation.

## Recette

Les tests PostgreSQL sont explicitement réservés à la base jetable `passorsmash_editorial_test` : ils en réinitialisent les données. Ne jamais les lancer contre une base contenant des données à conserver.

```powershell
docker compose up -d
# Créer passorsmash_editorial_test une seule fois dans PostgreSQL.
$env:DB_DATABASE='passorsmash_editorial_test'
node ace migration:run
$env:EDITORIAL_DB_TESTS='1'
npx playwright install chromium --only-shell
node ace test
npm run typecheck
npm run lint
npm run build
```

Couverture : schémas et interdiction des champs de publication, outils selon portées, destinations réseau, changements d’heure, idempotence et modifications concurrentes, gel en revue, approbation humaine unique, rollback des publications partielles, refus/réouverture, confidentialité des médias, autorisations OAuth locales, limite de budget et reprise simulée d’une génération. Le test navigateur couvre l’édition desktop/mobile et le refus d’un compte ordinaire ; il requiert le navigateur Playwright installé.

La recette complète sous **Node.js 24 LTS** réussit : **31 tests** unitaires, PostgreSQL, stockage S3 local et navigateur. TypeScript, ESLint et le build de production réussissent également. Les parcours incluent le consentement OAuth, la reprise après Discord simulé, les codes à usage unique, PKCE, l’expiration et l’audience des JWT, la rotation et le rejeu des refresh tokens, la révocation et la réautorisation. Un dernier essai avec votre compte Discord réel et le client final reste à effectuer après déploiement. L’essai des fournisseurs de génération et de notification en production reste indépendant du branchement MCP.
