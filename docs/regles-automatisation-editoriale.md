# Cahier des charges — MCP PassOrSmash

Ce document remplace le cadrage général de l’automatisation éditoriale. Il définit le serveur MCP, les outils accessibles à un assistant et leur articulation avec les préparations automatiques et la validation humaine. L’implémentation et ses limites de recette sont décrites dans [le guide de mise en service](mcp-editorial-mise-en-service.md). L’automatisation reste désactivée jusqu’à sa configuration et sa validation dans l’environnement cible.

## 1. Objectif

Permettre à un assistant connecté au site de consulter les playlists, préparer des propositions inspirées de l’actualité, modifier leurs contenus et suivre leur traitement. Deux préparations hebdomadaires doivent pouvoir fonctionner sans ordinateur personnel allumé. Toute publication exige une validation humaine préalable dans le tableau de bord.

Exemples de demandes à rendre possibles :

- « Quels sujets ont déjà été proposés cette semaine ? »
- « Prépare une playlist sur les nouvelles sorties de jeux. »
- « Montre-moi le brouillon et les sources utilisées. »
- « Remplace cette image et réorganise les éléments. »
- « Soumets cette version pour ma validation. »
- « Pourquoi la préparation de vendredi a-t-elle échoué ? »

## 2. Architecture à développer

Créer un adaptateur MCP côté serveur, intégré au projet AdonisJS ou déployé à côté de celui-ci si les contraintes de l’hébergement l’imposent. Il doit appeler des services métier partagés avec le tableau de bord, et non reproduire leur logique ni simuler des clics dans le site.

Organisation proposée :

- `app/mcp/` : définitions des outils, schémas et adaptation du protocole.
- `app/services/editorial/` : création, édition, contrôle et soumission des propositions.
- `app/services/news/` : collecte des sources et sélection des actualités.
- `app/services/generation/` : génération structurée et vérification des contenus.
- Services dédiés aux exécutions, médias, autorisations et traces d’audit.
- Tables PostgreSQL pour propositions, révisions, sources, exécutions et journal des actions.

Utiliser un SDK MCP maintenu plutôt qu’implémenter le protocole à la main. Prévoir un endpoint distant `/mcp` utilisant Streamable HTTP. Au début du développement, fixer une version du protocole et du SDK compatible avec les clients visés et vérifier les exigences officielles correspondantes. La session MCP ne doit pas être le stockage du workflow : chaque proposition et chaque exécution ont un identifiant durable.

Le MCP expose les capacités ; le planificateur déclenche les travaux ; les traitements en arrière-plan les exécutent. Un serveur MCP seul ne déclenche pas spontanément une tâche deux fois par semaine.

## 3. Contrat commun des outils

Chaque outil doit posséder un nom stable, une description précise, un schéma d’entrée strict et une sortie structurée documentée.

- Rejeter les champs inconnus et valider les longueurs, identifiants, valeurs et limites côté serveur.
- Paginer les listes avec un curseur ; limiter initialement les pages à 50 éléments.
- Exprimer les dates en ISO 8601 avec fuseau explicite.
- Toute mutation de contenu requiert `expected_revision` pour éviter d’écraser une modification concurrente.
- Toute création ou commande relançable requiert une `idempotency_key` propre à l’opération. La même clé avec une entrée différente doit être rejetée.
- Une tâche longue renvoie rapidement `job_id` et `status`. Son avancement se consulte séparément.
- Les erreurs métier renvoient un code stable, un message compréhensible, un identifiant de suivi et un indicateur de nouvelle tentative possible.
- Exemples de codes : `NOT_FOUND`, `FORBIDDEN`, `REVISION_CONFLICT`, `INVALID_STATE`, `VALIDATION_FAILED`, `BUDGET_EXCEEDED`, `PROVIDER_UNAVAILABLE`.
- Respecter le format d’erreur prévu par le SDK et le protocole choisis ; ne pas faire passer une erreur pour un succès.
- Les annotations MCP sur les effets de bord doivent être exactes. Elles ne remplacent jamais les contrôles d’autorisation.

## 4. Catalogue des outils de première version

Les noms ci-dessous sont les noms à exposer au client MCP. Les entrées sont les champs métier principaux, en complément des règles communes.

| Outil                        | Entrées principales                                                                   | Résultat et effet                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `get_editorial_status`       | Aucune                                                                                | Activation, prochain créneau, dernière exécution, propositions en attente, capacités autorisées |
| `list_playlists`             | Recherche, curseur, limite                                                            | Playlists accessibles et métadonnées ; lecture seule                                            |
| `get_playlist`               | `playlist_id`                                                                         | Contenu d’une playlist accessible ; lecture seule                                               |
| `list_proposals`             | État, catégorie, curseur, limite                                                      | Résumés des propositions autorisées                                                             |
| `get_proposal`               | `proposal_id`                                                                         | Contenu, révision, sources, médias, blocages et URL de prévisualisation protégée                |
| `find_news_topics`           | Catégories, période, limite                                                           | Sujets candidats et sources datées ; ne publie ni ne crée de playlist                           |
| `start_proposal_generation`  | Sujet fourni ou identifiant candidat, catégorie, nombre d’éléments, clé d’idempotence | Lance une préparation et renvoie son identifiant de tâche                                       |
| `get_job`                    | `job_id`                                                                              | État, étapes, proposition produite et erreur éventuelle                                         |
| `create_proposal`            | Titre, description, éléments, sources, clé d’idempotence                              | Crée un brouillon à partir de contenus fournis par le client                                    |
| `update_proposal`            | `proposal_id`, révision, champs éditoriaux                                            | Modifie uniquement les champs autorisés du brouillon                                            |
| `add_proposal_item`          | Proposition, révision, contenu et provenance                                          | Ajoute un élément au brouillon                                                                  |
| `update_proposal_item`       | Proposition, élément, révision, champs                                                | Modifie un élément du brouillon                                                                 |
| `remove_proposal_item`       | Proposition, élément, révision                                                        | Retire un élément du brouillon, sans supprimer un fichier partagé                               |
| `reorder_proposal_items`     | Proposition, révision, liste complète des identifiants                                | Change l’ordre ; refuse doublons et éléments manquants                                          |
| `import_proposal_image`      | Proposition, élément, révision, URL, crédit et licence                                | Lance l’import et les vérifications du média ; renvoie une tâche si nécessaire                  |
| `validate_proposal`          | Proposition et révision                                                               | Renvoie les contrôles réussis, avertissements et blocages ; ne vaut pas approbation humaine     |
| `submit_proposal_for_review` | Proposition, révision, clé d’idempotence                                              | Vérifie puis fige la version à examiner, la place en attente et déclenche la notification       |
| `list_editorial_runs`        | Période, état, curseur                                                                | Historique des passages et liens vers les tâches                                                |
| `get_editorial_settings`     | Aucune                                                                                | Réglages non secrets et calendrier, en lecture seule                                            |

Les réponses incluent uniquement les données nécessaires. Ne pas exposer les adresses personnelles, les secrets ou le détail interne des fournisseurs.

## 5. Actions volontairement réservées au tableau de bord

Pour garantir la validation manuelle, la première version n’expose aucun outil `publish`, `approve` ou équivalent. L’assistant peut préparer et soumettre ; l’administrateur publie dans l’interface authentifiée du site.

Sont également réservés au tableau de bord :

- Refuser ou rouvrir une proposition soumise.
- Modifier les jours, horaires, catégories, sources et plafonds budgétaires.
- Activer ou suspendre les passages automatiques.
- Attribuer les droits, configurer les fournisseurs et révoquer les connexions.

Ne pas exposer d’outil générique permettant du SQL, une requête HTTP arbitraire, l’exécution de commandes, la suppression de playlists existantes ou la modification des votes. Aucun champ `is_public`, `approved_by` ou statut libre ne doit permettre de contourner ces restrictions.

Une publication par MCP ne pourra être envisagée que dans une évolution explicitement décidée, avec une approbation humaine serveur liée à une révision précise. Un texte « approuvé » fourni par l’assistant n’est pas une preuve d’approbation.

## 6. Authentification et autorisations

- Protéger chaque appel et chaque ressource, pas seulement la découverte des outils.
- Prévoir une autorisation distante conforme à la spécification MCP retenue et aux clients supportés. Pour une connexion utilisateur distante, privilégier le flux OAuth prévu par MCP.
- La connexion Discord du site peut identifier l’administrateur lors de l’autorisation ; sa session navigateur ne devient pas automatiquement un accès MCP.
- Définir les portées `editorial:read`, `editorial:write` et `editorial:generate`. Aucune portée de publication en première version.
- Le compte d’automatisation possède seulement les capacités nécessaires à la préparation, jamais les droits de publication ou de gestion des accès.
- Vérifier identité, portées et propriété des objets à chaque appel. Ne pas faire confiance à un identifiant d’utilisateur fourni en argument.
- Permettre expiration et révocation des accès. Ne jamais transmettre aux fournisseurs les jetons MCP entrants.
- Configurer HTTPS, contrôle des origines et protections réseau selon les exigences du transport retenu.
- Journaliser l’identité du client et de l’acteur sans enregistrer leurs jetons.

## 7. États, révisions et validation humaine

États d’une proposition : `draft`, `in_review`, `rejected`, `published`.

- La génération crée un `draft` ; elle ne choisit pas son état final arbitrairement.
- Un brouillon incomplet peut être enregistré, mais les blocages empêchent sa soumission.
- La soumission passe la révision validée en `in_review` et la rend non modifiable par les outils MCP.
- Toute reprise d’édition exige une réouverture explicite dans le tableau de bord et une nouvelle révision à soumettre.
- La publication dans le tableau de bord vérifie la révision et crée atomiquement une playlist complète, avec l’identité du validateur et la date.
- Des validations simultanées ou répétées ne créent qu’une playlist publique.
- Les propositions et leurs médias restent protégés jusqu’à publication. Les liens d’aperçu ne sont pas des autorisations publiques permanentes.

Préférer un stockage de propositions séparé des playlists actuelles. Le champ `is_public` existant ne représente pas un état de validation.

## 8. Actualités et médias

Le MCP doit rendre les sources consultables, et non simplement retourner une playlist sans justification.

- Chaque sujet comporte des URL vérifiables, dates disponibles et dates de collecte.
- La veille utilise une liste de sources autorisées et une fenêtre de fraîcheur configurable.
- Les textes externes sont traités comme des données non fiables, jamais comme des instructions exécutables.
- Détecter les sujets déjà proposés pour éviter les répétitions.
- Ne pas inventer une actualité lorsque les sources manquent ; retourner un résultat sans sujet si nécessaire.
- Les images comportent provenance, crédit et conditions d’utilisation compatibles avec le site. Une licence inconnue bloque la soumission jusqu’à vérification ou remplacement.
- Contrôler les fichiers téléchargés, leur taille, leur format réel et les redirections. Bloquer l’accès aux réseaux internes et aux services de métadonnées de l’hébergement.
- Les fournisseurs de recherche, génération et images sont des adaptateurs configurables. Documenter leurs coûts et secrets nécessaires, sans les coder dans le dépôt.

## 9. Automatisation deux fois par semaine

Le planificateur serveur doit appeler les mêmes services métier que les outils MCP. Il n’a pas besoin de se reconnecter au MCP du même serveur.

Chaque passage :

1. Vérifie l’activation, le budget et l’absence d’exécution équivalente.
2. Recherche des sujets récents dans les catégories choisies.
3. Sélectionne un sujet pertinent qui n’a pas déjà été traité récemment.
4. Génère une proposition et vérifie les contenus et médias.
5. Soumet la révision pour examen si les contrôles sont satisfaits.
6. Notifie l’administrateur avec un lien vers l’aperçu protégé.

Configurer deux créneaux par semaine dans `Europe/Paris`, avec gestion du changement d’heure. Les jours, heures et canal de notification restent à choisir avant activation.

Un passage sans sujet ou en échec est enregistré et signalé. Une relance ne produit pas de doublon. Limiter les tentatives, leur durée et les coûts. Une notification échouée se relance indépendamment de la génération. Sans validation humaine, la proposition reste en attente sans limite provoquant une publication automatique.

## 10. Persistance et exploitation

Prévoir au minimum :

- Propositions et éléments, révisions, sources et médias associés.
- Exécutions avec clé unique de créneau, progression, tentatives, erreurs et coûts disponibles.
- Réglages de planification et de veille.
- Identités clientes, droits et mécanismes de révocation selon le système d’autorisation retenu.
- Audit des créations, modifications, soumissions et publications.

Les opérations concurrentes utilisent transactions et contraintes de base. Les tâches sont reprenables après interruption. Les journaux ne contiennent ni secrets ni données sensibles inutiles. Définir une rétention et ne jamais nettoyer un média utilisé par une playlist publique.

## 11. Plan de développement

1. Choisir le client MCP cible, vérifier sa compatibilité et fixer SDK, protocole, transport et autorisation.
2. Créer les données éditoriales, les rôles et les services métier.
3. Implémenter l’interface de revue et la publication humaine atomique.
4. Exposer d’abord les outils de lecture et tester une connexion authentifiée.
5. Ajouter création, édition, révisions et soumission avec des contenus de démonstration.
6. Ajouter veille, génération, imports et tâches en arrière-plan.
7. Ajouter les passages hebdomadaires et les notifications.
8. Documenter le branchement du client, les réglages, la révocation et la résolution des erreurs ; effectuer la recette avant activation.

Le choix précis de l’hébergement, des fournisseurs et du budget est une décision d’implémentation à consigner. Le protocole ne doit pas être choisi à partir d’exemples anciens sans vérification.

## 12. Critères de recette

- Un client autorisé découvre et utilise uniquement les outils correspondant à ses droits.
- Un appel sans accès, un jeton révoqué et un accès à la proposition d’un autre périmètre sont refusés.
- Les listes paginées, les schémas et les erreurs sont utilisables par le client choisi.
- Une modification avec une ancienne révision échoue sans écraser le contenu.
- Une commande rejouée avec la même clé ne crée pas de doublon.
- La génération longue rend la main et son état reste consultable après reconnexion.
- Un contenu externe malveillant ne peut déclencher d’action ou obtenir de secrets.
- Une proposition en revue ne peut plus être modifiée par le MCP.
- Aucun outil ni argument ne permet de publier, directement ou indirectement.
- Seule une action humaine authentifiée publie la révision examinée, une seule fois.
- Les brouillons et leurs médias sont inaccessibles publiquement, y compris par URL directe.
- Les deux créneaux, changements d’heure, reprises après panne et limites budgétaires sont vérifiés.
- Une panne de fournisseur ou de notification ne produit aucune playlist publique partielle.
- La création manuelle et les votes existants continuent de fonctionner.

Tester les fournisseurs avec des simulations pour les contrôles automatisés, puis effectuer un essai de bout en bout avec le client MCP cible et une publication manuelle de démonstration.

## 13. Références de protocole

Consulter les spécifications officielles lors du choix de version et de la réalisation :

- Spécification MCP et versions : https://modelcontextprotocol.io/specification/
- Outils, référence versionnée : https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx
- Transport Streamable HTTP, référence versionnée : https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/basic/transports.mdx

Ces liens constituent des références de conception ; ils ne dispensent pas de vérifier la compatibilité du SDK et du client retenus avec une même version du protocole.
