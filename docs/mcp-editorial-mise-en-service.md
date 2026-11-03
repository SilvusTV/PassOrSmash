# Mise en service de l’édito et du MCP

## Installation

1. Installer les dépendances et construire l’application.
2. Appliquer `node ace migration:run`. La migration `1793800000000_add_editorial_item_identity` relie les éléments existants à leurs identifiants éditoriaux afin de préserver leurs votes pendant les mises à jour.
3. Conserver les administrateurs dans `EDITORIAL_ADMIN_DISCORD_IDS`.
4. Ouvrir `/admin/editorial`. La création et la publication manuelles n’exigent aucun fournisseur de génération ni configuration de flux.
5. Pour le MCP, utiliser `https://votre-domaine/mcp`, se connecter avec Discord et autoriser `editorial:read editorial:write`. Ajouter `editorial:generate` si nécessaire. Actualiser la liste des outils après déploiement. Voir [la connexion Discord](mcp-discord-connexion.md).

Le dossier `tmp/editorial` doit être persistant et partagé entre les processus pour conserver les fichiers importés. Il ne doit pas être exposé directement : la route `/editorial/media/:id` contrôle leur accès. Les liens d’image distants sont utilisés sans téléchargement.

## Actions disponibles

| Action de l’éditeur | Outil MCP |
| --- | --- |
| Lister et ouvrir | `list_proposals`, `get_proposal` |
| Créer | `create_proposal` (`publish: true` pour publier directement) |
| Enregistrer tout le formulaire | `save_proposal` (`publish: true` pour enregistrer et publier atomiquement) |
| Modifier le texte | `update_proposal`, `update_proposal_item` |
| Ajouter, retirer, déplacer un élément | `add_proposal_item`, `remove_proposal_item`, `reorder_proposal_items` |
| Choisir un lien, importer un fichier, retirer une image | `set_proposal_image` |
| Publier | `publish_proposal` |
| Retirer du site | `unpublish_proposal` |
| Supprimer | `delete_proposal` |
| Lire ou changer les réglages automatiques | `get_editorial_settings`, `update_editorial_settings` |
| Préparer et suivre une génération | `find_news_topics`, `start_proposal_generation`, `get_job`, `list_editorial_runs` |
| Relancer une tâche échouée | `retry_editorial_job` |

Le serveur expose 9 outils avec la lecture seule, 27 avec les trois portées. Les outils de playlists existants restent disponibles. `import_proposal_image` est un alias conservé pour associer un lien directement. `validate_proposal` permet de connaître les seuls éléments manquants pour publier, sans imposer d’étape séparée.

## Exemple de création

```json
{
  "content": {
    "title": "Deux destinations à comparer",
    "items": [
      { "title": "La mer", "image_url": "https://exemple.fr/mer.jpg" },
      { "title": "La montagne", "image_url": "https://exemple.fr/montagne.jpg", "image_credit": "Photo Alice" }
    ]
  },
  "publish": true,
  "idempotency_key": "destinations-2026-11-03"
}
```

Une image peut être envoyée avec `set_proposal_image` en passant `data_base64` (fichier de 8 Mo maximum) ou `url`. Sans les deux, l’image est retirée. Le crédit peut être absent ou vide. Les modifications d’une sélection en ligne s’appliquent immédiatement et doivent garder les deux éléments et leurs images. Une révision périmée est refusée pour éviter d’écraser une modification faite depuis une autre session.

## Automatisation facultative

Renseigner `EDITORIAL_GENERATION_URL` et son jeton éventuel, ajouter des flux JSON Feed et choisir les horaires dans les réglages repliés. Les passages automatiques utilisent le compte configuré et créent des brouillons. Exécuter `node ace editorial:tick` chaque minute sur le serveur. Les plafonds d’appels et de coût restent appliqués. Les notifications (`EDITORIAL_NOTIFICATION_URL`, jeton éventuel) sont facultatives.

L’OAuth externe reste pris en charge via `MCP_OAUTH_ISSUER`, `MCP_OAUTH_JWKS_URL` et les accès locaux. Les nouvelles capacités suivent la portée d’écriture existante ; aucune portée supplémentaire n’est nécessaire. Le consentement décrit explicitement la publication et la suppression.
