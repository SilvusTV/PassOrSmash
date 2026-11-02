# Connecter le MCP avec son compte Discord

PassOrSmash fournit désormais son propre serveur d’autorisation OAuth, intégré à la connexion Discord existante. Aucun fournisseur d’identité supplémentaire n’est nécessaire. Le protocole est pris en charge par `oidc-provider` 9.13.3, avec un adaptateur PostgreSQL persistant.

## Après déploiement

1. Utiliser Node.js **24 LTS** (version de recette), installer les dépendances et appliquer `node ace migration:run --force` depuis le build. La nouvelle migration crée les tables OAuth et complète les connexions éditoriales.
2. Conserver les paramètres Discord existants : `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`. L’URL de retour Discord reste `https://passorsmash.fr/auth/discord/callback` : il n’y a pas de nouvelle URL Discord à enregistrer.
3. Vérifier `APP_URL=https://passorsmash.fr` et renseigner `EDITORIAL_ADMIN_DISCORD_IDS` avec les identifiants Discord des administrateurs autorisés.
4. **Laisser `MCP_OAUTH_ISSUER` et `MCP_OAUTH_JWKS_URL` vides.** Le serveur utilise alors automatiquement l’autorisation intégrée. Ces variables ne servent plus qu’à sélectionner l’ancien mode avec un fournisseur externe.
5. Conserver la même `APP_KEY` sur tous les processus et après redéploiement. Elle protège les données OAuth persistées et signe les cookies. La changer rend les clés privées et autorisations enregistrées illisibles ; sauvegarder ensemble la base et cette clé.
6. Servir l’application en HTTPS. Le reverse proxy doit conserver le Host public et remplacer correctement `X-Forwarded-Proto`. L’autorité OAuth utilise ses cookies sécurisés en production.

Configuration minimale supplémentaire :

```env
APP_URL=https://passorsmash.fr
EDITORIAL_ADMIN_DISCORD_IDS=VOTRE_IDENTIFIANT_DISCORD
MCP_OAUTH_ISSUER=
MCP_OAUTH_JWKS_URL=
```

Pour un client MCP exécuté dans un navigateur, ajouter son origine exacte à `MCP_ALLOWED_ORIGINS`. Les clients natifs et les appels serveur sans Origin n’en ont pas besoin. Ne pas ajouter une origine au hasard : reprendre celle effectivement envoyée par le client.

## Paramètres du client MCP

| Champ                        | Valeur en production                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| Nom libre                    | `PassOrSmash`                                                                                     |
| URL MCP                      | `https://passorsmash.fr/mcp`                                                                      |
| Transport                    | Streamable HTTP                                                                                   |
| Authentification             | OAuth, inscription dynamique du client (DCR)                                                      |
| Portées                      | `editorial:read editorial:write editorial:generate`                                               |
| Identifiant et secret client | Aucun à inventer : le client s’enregistre automatiquement ; c’est un client public avec PKCE S256 |

Le client doit prendre en charge DCR et l’échange de jeton avec `token_endpoint_auth_method=none`. La V1 intégrée ne propose pas CIMD, `client_secret_basic`, `client_secret_post`, `private_key_jwt` ni le flux client credentials. La méthode DCR est documentée par [OpenAI](https://developers.openai.com/plugins/build/auth).

La découverte publie les endpoints suivants ; il n’est normalement pas nécessaire de les saisir manuellement :

| Fonction                      | URL                                                               |
| ----------------------------- | ----------------------------------------------------------------- |
| Ressource protégée            | `https://passorsmash.fr/.well-known/oauth-protected-resource/mcp` |
| Serveur d’autorisation        | `https://passorsmash.fr/.well-known/oauth-authorization-server`   |
| Alias de découverte           | `https://passorsmash.fr/.well-known/openid-configuration`         |
| Autorisation                  | `https://passorsmash.fr/oauth/authorize`                          |
| Jetons                        | `https://passorsmash.fr/oauth/token`                              |
| Inscription DCR               | `https://passorsmash.fr/oauth/register`                           |
| Clés publiques JWKS           | `https://passorsmash.fr/oauth/jwks`                               |
| Révocation d’un refresh token | `https://passorsmash.fr/oauth/revoke`                             |

L’issuer est `https://passorsmash.fr` et l’audience des jetons est exactement `https://passorsmash.fr/mcp`. Les URLs locales de développement sont déduites de `APP_URL` de la même manière.

## Parcours de connexion

1. Le client découvre les paramètres et enregistre son URL de retour.
2. Il demande une autorisation avec un état et une preuve PKCE S256.
3. PassOrSmash ouvre Discord si aucune session du site n’existe, puis reprend la demande MCP conservée dans la session.
4. Un administrateur voit l’application déclarée, le domaine de retour et les droits demandés. Il peut accepter ou refuser. Un utilisateur Discord ordinaire est refusé.
5. Après acceptation, le site crée la connexion éditoriale et retourne au client un code temporaire, lié à sa preuve PKCE. La réponse contient aussi `iss`, conformément à RFC 9207.
6. Le client échange le code contre un jeton d’accès signé et, s’il a enregistré le grant type correspondant, un refresh token.

Chaque nouvelle demande repasse par le consentement. Une réautorisation remplace le grant précédent : les anciens jetons ne redeviennent pas utilisables. L’écran distingue le nom déclaré du client du domaine de retour à vérifier.

La connexion apparaît automatiquement dans **Studio éditorial → Connexions MCP**. Ne pas saisir manuellement de `sub` ou d’identifiant client pour le mode Discord intégré. Le formulaire manuel n’est affiché qu’en mode fournisseur externe.

## Durées et révocation

- Code d’autorisation : 60 secondes, usage unique.
- Demande interactive : 10 minutes.
- Jeton d’accès : 15 minutes, signé en RS256, type `at+jwt`, audience MCP obligatoire.
- Grant et connexion : 30 jours maximum.
- Refresh token : rotation à chaque renouvellement ; le rejeu d’un ancien refresh token est refusé.

Le bouton **Révoquer** du studio retire l’accès dès l’appel suivant, y compris avec un JWT non expiré. La suppression du rôle administrateur et l’expiration de la connexion sont également contrôlées à chaque appel et à chaque émission de jeton. La révocation d’un refresh token par l’endpoint OAuth révoque son grant et invalide immédiatement les JWT associés. Cet endpoint ne prend pas en charge la révocation d’un JWT isolé ; utiliser le refresh token ou la révocation de la connexion dans le studio.

## Persistance et exploitation

Les clés privées de signature sont créées au premier accès nécessitant le serveur OAuth et conservées chiffrées dans PostgreSQL. Le JWKS public n’expose jamais les paramètres privés. Les identifiants de codes et de refresh tokens sont indexés par empreinte SHA-256 ; les payloads du fournisseur sont chiffrés avec `APP_KEY`. Les consommations sont atomiques, y compris avec plusieurs workers.

Les endpoints de protocole sont traités avant le parseur Adonis, afin de laisser la bibliothèque vérifier les requêtes originales. Le consentement reste une page du site avec session Discord et protection CSRF. Les inscriptions et appels OAuth sont limités en base : 120 requêtes par minute et adresse réseau observée, 10 inscriptions par minute pour cette adresse et 100 inscriptions quotidiennes au total. Le reverse proxy peut ajouter des limites complémentaires. Les fenêtres sont fixes ; une réponse 429 demande de patienter.

Les enregistrements expirés ne sont plus acceptés. Une purge de maintenance peut supprimer les lignes `mcp_oauth_records` dont `expires_at` est passée ; ne jamais supprimer les clés privées ni les clients enregistrés encore utilisés. Les clients DCR doivent rester persistants pendant l’utilisation de la connexion. Prévoir la rotation des clés avec une procédure distincte conservant les anciennes clés publiques jusqu’à expiration des jetons signés ; aucune rotation automatique n’est exécutée par cette version.

## Vérifications avant et après déploiement

- Les métadonnées et le JWKS doivent répondre 200 ; `/mcp` sans jeton doit répondre 401 avec `WWW-Authenticate`, et non plus « OAuth non configuré ».
- Une connexion administrateur doit afficher le consentement, retourner au client et exposer les outils selon ses droits.
- Un refus, un compte sans droits, une preuve PKCE invalide, un code rejoué, un jeton expiré ou une audience différente doivent échouer.
- Après révocation dans le studio, le même jeton doit être refusé.
- Les propositions passent par l’examen humain du studio. Les outils `create_playlist` et `update_playlist` agissent directement sur les playlists du compte ; leur champ `visibility: public` les rend immédiatement publiques.

## Création et édition des playlists

Reconnecter les anciennes connexions limitées à `editorial:read` en demandant `editorial:read editorial:write` (et `editorial:generate` pour la préparation d’actualité). Le challenge OAuth annonce maintenant toutes les portées disponibles. Les anciennes autorisations ne sont jamais augmentées silencieusement. Actualiser ensuite la découverte des outils côté client.

- `create_playlist` : titre, 2 à 100 éléments (`title`, `description`, `image_url`) et `idempotency_key` unique. Privée par défaut. `description`, `accent` et `visibility` sont facultatifs. Une même clé avec le même contenu renvoie la même playlist ; avec un contenu différent elle échoue.
- `get_playlist` : lire `edit.revision` et les identifiants des éléments avant modification.
- `update_playlist` : fournir `expected_revision`, le contenu complet et les IDs conservés dans l’ordre final. Les éléments conservés gardent leurs votes. Une modification concurrente est refusée. Les playlists d’un autre compte restent en lecture seule, même pour un administrateur connecté au MCP.

Le serveur expose 9 outils en lecture seule et 21 outils avec les trois portées. Aucun outil ne permet d’approuver ou publier une proposition éditoriale.

Les tests automatisés utilisent Chromium, PostgreSQL et un client OAuth avec récepteur HTTP local. Discord est simulé pour tester le retour de connexion sans utiliser de vrais identifiants ni appeler son API. Le dernier essai avec votre compte Discord et le client final doit être effectué après déploiement.

Résultat de recette : **31 tests réussis** sous Node.js 24.22.2, TypeScript sans erreurs, ESLint sans erreurs et build de production réussi. Les aperçus du consentement et du studio ont également été contrôlés sur desktop et mobile.
