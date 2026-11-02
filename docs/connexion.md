# Connexion et comptes

La page `/login` propose Discord, Google (si configuré) et e-mail/mot de passe. `/signup` crée un compte par e-mail avec confirmation du mot de passe (8 à 128 caractères). Les mots de passe sont hachés par le modèle User. Aucune vérification d’adresse ni récupération de mot de passe par e-mail n’est incluse dans ce parcours.

## Configurer Google

1. Dans Google Cloud / Google Auth Platform, configurer l’écran de consentement et créer un client OAuth de type **Application Web**.
2. Déclarer comme URI de redirection autorisée `https://passorsmash.fr/auth/google/callback` (ou exactement la valeur de `APP_URL` suivie de `/auth/google/callback` pour un autre environnement). En local : `http://localhost:3333/auth/google/callback`.
3. Renseigner `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sur le serveur et redémarrer. Ne jamais placer le secret dans une variable `VITE_*` ni dans le navigateur.
4. Appliquer `node ace migration:run --force` avant de servir la nouvelle version. La migration ajoute `users.google_id`, unique et nullable.
5. Si l’application Google est en mode test, ajouter les comptes de recette dans la liste des utilisateurs de test.

Sans ces variables, le bouton Google reste masqué et l’accès direct renvoie une explication. Aucun secret Google n’est stocké dans le dépôt.

Le flux utilise le code d’autorisation avec PKCE, un état lié à la session et une expiration de dix minutes. Le serveur vérifie la signature de l’ID token, l’émetteur, l’audience, l’expiration, le nonce et l’adresse vérifiée, puis identifie le compte par le `sub` Google. Les jetons du fournisseur ne sont pas conservés.

## Comptes existants

Une adresse identique ne provoque pas de fusion automatique. Se connecter d’abord par sa méthode habituelle, ouvrir `/profile`, puis cliquer sur **Associer mon compte Google**. Cette association exige la même session connectée du début à la fin du flux Google. Un compte Google déjà lié à un autre utilisateur est refusé. Les playlists, les droits Discord et le mot de passe existant restent rattachés au même compte.

Un nouveau compte Google ne reçoit pas de mot de passe utilisable. Les droits administrateur restent fondés sur la liste des identifiants Discord autorisés ; une connexion Google seule n’accorde aucun droit administrateur. La suspension bloque aussi la connexion Google.

Documentation de référence : [OpenID Connect Google](https://developers.google.com/identity/openid-connect/openid-connect).
