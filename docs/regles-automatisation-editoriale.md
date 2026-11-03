# Édito : fonctionnement simplifié

L’espace édito et le MCP utilisent les mêmes services. Une sélection se crée, se modifie et se publie directement, sans circuit de soumission, refus ou approbation. Les anciens états `in_review` et `rejected` restent lisibles et peuvent être modifiés comme des brouillons.

## Parcours

- Une page liste les sélections, avec recherche et filtre brouillons/en ligne.
- Un seul formulaire regroupe le titre, la catégorie, la description et les éléments.
- Chaque élément possède son texte, son lien d’image ou son fichier et un crédit facultatif.
- Enregistrer garde un brouillon. Publier enregistre et publie en une action.
- Une sélection en ligne se modifie directement avec Mettre à jour.
- Retirer du site conserve le lien, la playlist et ses votes, en la rendant privée.
- Supprimer efface la sélection, la playlist associée et leurs votes ; l’interface demande confirmation.

Pour publier, il faut un titre valide, au moins deux éléments et une image par élément. Les sources, notes, crédits et licences ne constituent pas des prérequis. Les liens d’image sont utilisés directement dans le navigateur, sans téléchargement serveur. Un fichier importé est vérifié et converti en PNG ; limite de 8 Mo.

Les contrôles techniques restent internes : compte autorisé, propriété des données, formats, limites de taille et protection contre l’écrasement d’une modification concurrente. Ils ne créent aucune étape de revue supplémentaire.

## MCP

Le droit `editorial:write` donne accès à la création, l’édition, les images, la publication, le retrait du site, la suppression, les réglages et les relances. `editorial:read` reste strictement en lecture. `editorial:generate` permet la recherche d’actualité et le lancement de préparations.

Les outils s’appuient sur les mêmes services que les boutons de l’éditeur. Les révisions sont récupérées par `get_proposal` et renvoyées par chaque modification. Les identifiants d’éléments sont conservés pour préserver leurs votes, même après changement d’ordre ou republication. Les éléments supprimés perdent leurs votes.

La connexion OAuth Discord et la révocation des accès restent requises. Aucun outil ne permet de s’accorder lui-même des droits ni de modifier les données d’un autre compte.

## Préparation automatique

La planification est facultative et repliée dans l’interface. Elle prépare des brouillons ; elle ne publie pas spontanément. Les flux d’actualité, le fournisseur, les horaires et les plafonds d’appels/coût ne sont nécessaires qu’à cette fonction. Les notifications sont facultatives. Le worker conserve ses baux, reprises et limites pour ne pas lancer plusieurs fois un travail payant.

Voir [la mise en service](mcp-editorial-mise-en-service.md) et [la recette](studio-editorial-recette.md).
