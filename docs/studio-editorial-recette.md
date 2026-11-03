# Recette de l’édito simplifié

Les tests destructifs de données sont limités à `passorsmash_editorial_test`, avec `EDITORIAL_DB_TESTS=1`. Ne jamais les lancer sur la base du site.

- `node ace test unit --files tests/unit/editorial.spec.ts` : schémas minimaux, crédits facultatifs, mises à jour partielles sans réinitialisation et découverte MCP suivant les droits.
- `node ace test functional --files tests/functional/editorial.spec.ts` : parcours MCP complet avec le SDK réel, publication directe sans sources ni revue, images par lien/fichier, mise à jour en ligne, retrait et republication sans perte de votes, réglages, relance et suppression ; propriété des données et transactions.
- `node ace test browser --files tests/browser/editorial_workflow.spec.ts` : liste simple, formulaire unique, images dans chaque élément, import PC avec crédit vide, aperçu, publication, retrait, modification, republication, suppression, réglages repliés, conservation du texte après conflit et affichage mobile.
- `node ace test browser --files tests/browser/editorial.spec.ts` : accès administrateur et refus des comptes ordinaires.
- `node ace test browser --files tests/browser/oauth.spec.ts` : connexion Discord, consentement, découverte des 27 outils, renouvellement et révocation.

Vérifier aussi `npm run typecheck`, le lint des fichiers modifiés et `npm run build`. Les scénarios automatisés utilisent des images et fournisseurs de test. Le branchement au client MCP déployé et aux fournisseurs de production reste une vérification de déploiement.

Recette du 3 novembre 2026 : 7 tests unitaires, 16 tests fonctionnels, 3 tests navigateur de l’édito et 11 tests OAuth réussis sur une base PostgreSQL jetable. La migration a également été appliquée à une sélection au format précédent : identité des éléments et compteurs de votes conservés. Les captures ordinateur et mobile ont été contrôlées.
