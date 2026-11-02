# Studio éditorial — recette du 2 novembre 2026

## Changements

- Refonte du studio et de l’éditeur dans les couleurs et la typographie du site, avec navigation par sections, recherche, filtres, états en français et variantes mobile/clair/sombre.
- Ouverture immédiate des nouveaux brouillons, sauvegarde depuis les sections contenu et images, conservation des saisies en cas de conflit, garde avant de quitter des modifications non enregistrées.
- Saisie multiligne conservée pendant l’édition ; nettoyage des lignes vides à l’enregistrement.
- Suivi et actualisation des imports dans la proposition, affichage des erreurs et relance des tâches échouées.
- Résolution DNS asynchrone avec délai maximal, cache et regroupement des demandes simultanées. Connexions épinglées aux adresses publiques validées ; jusqu’à trois redirections HTTPS revérifiées pour les images.
- Imports simultanés sur des éléments distincts sans conflit global de révision. Deux remplacements concurrents de la même image ne s’écrasent pas silencieusement.
- Outil MCP `create_playlist` privé par défaut et idempotent. Édition vérifiée via `get_playlist` / `update_playlist`, avec conservation des identifiants et votes, contrôle du propriétaire et refus des révisions obsolètes.

## Vérifications

La suite générale a réussi : **63 tests**, dont 12 unitaires, 28 d’intégration et 23 navigateur. Exécution sous Node.js 24 avec PostgreSQL sur la base jetable `passorsmash_editorial_test` et stockage S3 local.

Les parcours couvrent notamment la création, les réglages, les filtres, les sources multiligne, le réordonnancement, une sauvegarde en conflit, les imports parallèles, un échec d’import suivi d’une relance, l’actualisation automatique, l’aperçu, la soumission, le refus, la réouverture et la publication. Les contrôles MCP passent par le SDK réel ; les fournisseurs de génération et de médias des scénarios sont simulés.

Deux téléchargements HTTPS réels ont également été vérifiés : Wikimedia (118 ms) et Unsplash (84 ms), avec décodage des images reçues. Ces mesures sont locales et ne mesurent pas les performances du serveur de production.

Captures de contrôle dans `tmp/` : `editorial-admin-desktop.png`, `editorial-proposal-mobile.png`, `studio-images-desktop.png`, `studio-preview-mobile.png` et `studio-connections-dark-mobile.png`.

## Mise en service

Les changements sont locaux et doivent être déployés pour modifier le site en ligne. Aucune nouvelle migration ni dépendance n’est nécessaire.

Le connecteur actif a confirmé uniquement `editorial:read`. Après déploiement, le reconnecter en demandant `editorial:read editorial:write`, puis actualiser sa liste d’outils. Ajouter `editorial:generate` pour la génération. Les autorisations existantes ne sont pas augmentées silencieusement.

La préparation automatique du serveur connecté reste désactivée : sources JSON Feed, compte de préparation, fournisseur de génération et notification ne sont pas configurés. Le studio signale cette configuration manquante ; les sélections manuelles restent utilisables.
