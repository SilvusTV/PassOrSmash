# Administration

L’espace `/admin` est accessible après connexion avec un compte Discord dont l’identifiant figure dans `EDITORIAL_ADMIN_DISCORD_IDS` (identifiants séparés par des virgules). Il utilise les mêmes droits que le studio éditorial. Les contrôles sont effectués côté serveur sur chaque page et chaque action.

## Mise en service

Déployer le code puis appliquer la migration avec `node ace migration:run --force` dans l’environnement de production. Elle ajoute le statut de suspension des comptes et la table de journalisation `admin_audit`. Vérifier la variable `EDITORIAL_ADMIN_DISCORD_IDS`, puis ouvrir `/admin`.

## Vue d’ensemble

Le tableau de bord regroupe tous les comptes, les comptes suspendus et récemment créés, toutes les playlists publiques et privées, leurs éléments et les votes. Il affiche aussi les créations et votes sur 30 jours, les dernières inscriptions et playlists, les propositions en attente et les dernières actions administratives.

Les participants correspondent aux identifiants visiteurs distincts ayant voté : ce ne sont pas des personnes uniques certifiées. Les statistiques portent sur les données encore présentes ; supprimer une playlist ou un élément supprime également ses votes. Le site ne mesure pas ici les visites de pages.

## Comptes

La liste permet de rechercher par nom, pseudo, adresse électronique ou identifiant Discord et de filtrer par statut. La fiche d’un compte présente ses statistiques et ses playlists, avec un lien vers la liste complète.

La suspension exige un motif. Elle bloque les connexions et les sessions existantes dès leur prochaine requête et révoque les connexions éditoriales du compte. Elle conserve les données et les playlists. La réactivation permet de se reconnecter ; les anciennes connexions éditoriales restent révoquées. La suspension de son propre compte ou d’un administrateur actif est interdite : leurs droits se gèrent dans la configuration du serveur.

## Playlists

La liste couvre toutes les playlists, y compris privées, avec recherche, filtres de visibilité et de créateur et pagination. L’administration peut modifier le titre, la description, la visibilité, la couleur, les éléments, leurs images et leur ordre.

Les éléments conservés gardent leurs identifiants et leurs votes. Retirer un élément supprime ses votes lors de l’enregistrement. Le propriétaire et le lien de partage restent identiques. Une vérification de version bloque l’écriture si la playlist a changé depuis son ouverture ; il faut alors recharger la page.

La suppression exige de recopier l’identifiant de partage et supprime la playlist, ses éléments et leurs votes. Les fichiers de médias partagés sont conservés. Les modifications, suppressions et changements de statut sont journalisés avec leur auteur et leur date.

## Studio et confidentialité

La navigation donne accès au studio existant. Le studio reste centré sur les propositions du compte connecté ; le compteur de propositions en attente du tableau de bord est global. Les outils et permissions MCP restent inchangés.

Les pages administratives sont réservées aux administrateurs, exclues de l’indexation et servies sans cache. L’aperçu d’une playlist privée peut afficher ses médias éditoriaux publiés ; il ne donne pas accès aux images de brouillons des autres comptes. Les mots de passe et secrets de connexion ne sont pas transmis aux pages d’administration.

## Vérifications locales

Les tests de gestion et de navigateur utilisent exclusivement la base `passorsmash_editorial_test`, avec `EDITORIAL_DB_TESTS=1`. Ne jamais exécuter ces scénarios sur une base contenant des données à conserver.
