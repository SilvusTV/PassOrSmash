<div align="center">
  <img src="public/favicon.svg" width="92" alt="Pass or Smash" />

# Pass or Smash

**Crée une playlist. Partage-la. Laisse les autres trancher.**

Une expérience sociale rapide où chaque image ne laisse que deux choix : **Smash** ou **Pass**.

[![AdonisJS](https://img.shields.io/badge/AdonisJS-7-5A45FF?style=flat-square)](https://adonisjs.com/)
[![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square)](https://react.dev/)
[![Inertia](https://img.shields.io/badge/Inertia-3-9553E9?style=flat-square)](https://inertiajs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square)](https://www.typescriptlang.org/)
</div>

---

## Le concept

Pass or Smash permet de composer des playlists d'images autour de n'importe quel thème : destinations, design, nourriture, personnages ou débats entre amis.

Le créateur se connecte avec Discord, ajoute ses images par URL ou import, puis choisit si sa playlist est publique ou privée. Les participants peuvent voter sans créer de compte et découvrent le classement à la fin.

## Fonctionnalités

- Authentification OAuth2 avec Discord
- Playlists publiques ou privées
- Ajout d'images par URL ou import de fichier
- Stockage S3 compatible avec MinIO en développement
- Titres et descriptions pour chaque image
- Vote Smash/Pass accessible sans compte
- Résultats et classement communautaire
- Tableau de bord pour gérer ses playlists
- Page Explorer pour découvrir les playlists publiques
- Interface responsive et accessible
- Sitemap, `robots.txt` et métadonnées SEO

## Stack

| Couche           | Technologie                        |
| ---------------- | ---------------------------------- |
| Backend          | AdonisJS 7, Lucid ORM, VineJS      |
| Frontend         | React 19, Inertia.js 3, TypeScript |
| Base de données  | PostgreSQL 17 + Lucid ORM          |
| Authentification | Sessions AdonisJS + Discord OAuth2 |
| Images           | AdonisJS Drive + API compatible S3 |
| Stockage local   | MinIO avec Docker Compose          |
| Tests            | Japa                               |

## Démarrage local

### Prérequis

- Node.js 24 ou plus récent
- npm
- Docker Desktop ou Docker Engine avec Compose
- Une application dans le [Discord Developer Portal](https://discord.com/developers/applications)

### Installation

```bash
git clone git@github.com:SilvusTV/PassOrSmash.git
cd PassOrSmash
npm install
```

Copie ensuite le fichier d'environnement :

```bash
cp .env.example .env
```

Sous PowerShell :

```powershell
Copy-Item .env.example .env
```

Génère une clé applicative, démarre PostgreSQL et MinIO, puis prépare la base de données :

```bash
node ace generate:key
docker compose up -d
node ace migration:run
```

Enfin, lance le serveur de développement :

```bash
npm run dev
```

L'application est disponible sur [http://localhost:3333](http://localhost:3333). PostgreSQL écoute sur le port `5432` et la console MinIO est accessible sur [http://localhost:9001](http://localhost:9001).

## Base de données

Le projet utilise PostgreSQL en développement, pendant les tests et en production. Docker Compose crée automatiquement une base locale `passorsmash` avec les identifiants présents dans `.env.example`.

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=passorsmash
DB_PASSWORD=passorsmash-local-secret
DB_DATABASE=passorsmash
```

Après toute modification du schéma, applique les migrations avec `node ace migration:run`.

## Configuration Discord

Dans ton application Discord :

1. Ouvre **OAuth2** dans le menu latéral.
2. Ajoute cette URL dans **Redirects** :

   ```text
   http://localhost:3333/auth/discord/callback
   ```

3. Récupère l'**Application ID** et le **Client Secret**.
4. Complète les variables suivantes dans `.env` :

   ```env
   DISCORD_CLIENT_ID=ton_application_id
   DISCORD_CLIENT_SECRET=ton_client_secret
   DISCORD_REDIRECT_URI=http://localhost:3333/auth/discord/callback
   ```

> Ne committe jamais ton fichier `.env` ou ton Client Secret.

## Stockage des images

Le projet utilise une abstraction S3 grâce à AdonisJS Drive. En local, `docker-compose.yml` démarre :

- MinIO sur le port `9000` ;
- sa console d'administration sur le port `9001` ;
- un conteneur d'initialisation qui crée automatiquement le bucket public `passorsmash-images`.

Pour utiliser AWS S3, Cloudflare R2, DigitalOcean Spaces ou un autre service compatible en production, adapte simplement les variables `AWS_*`, `S3_BUCKET`, `S_3_ENDPOINT` et `S_3_FORCE_PATH_STYLE`. Le code d'import reste identique.

Les formats acceptés sont JPG, PNG, WebP et GIF, avec une taille maximale de 8 Mo par image.

## Commandes utiles

```bash
npm run dev        # serveur avec rechargement à chaud
npm run typecheck  # vérification TypeScript backend + frontend
npm run lint       # analyse ESLint
npm run format     # formatage Prettier
npm test           # tests Japa
npm run build      # build de production
```

## Structure du projet

```text
app/                Contrôleurs, modèles et validateurs AdonisJS
config/             Configuration de l'application et du stockage
database/           Migrations et schéma Lucid
inertia/            Pages, composants et styles React
public/             Ressources publiques et favicon
resources/views/    Layout HTML racine
start/              Routes, environnement et middleware
tests/              Tests fonctionnels
docker-compose.yml  PostgreSQL et stockage MinIO locaux
```

## Mise en production

Avant de déployer :

1. configure une instance PostgreSQL managée et renseigne les variables `DB_*` ;
2. remplace les identifiants MinIO locaux par ceux de ton fournisseur S3 ;
3. ajoute l'URL Discord de production dans le portail développeur ;
4. configure `APP_URL`, `DISCORD_REDIRECT_URI` et les secrets via ton hébergeur ;
5. exécute `node ace migration:run --force`, puis démarre le build avec `npm start`.

## Sécurité

- Les créations et modifications de playlists nécessitent une session Discord.
- Les imports sont validés côté serveur par extension et taille.
- Les formulaires bénéficient de la protection CSRF d'AdonisJS Shield.
- Les secrets restent exclusivement dans les variables d'environnement.

---

<div align="center">
  <strong>Des choix simples. Des débats sans fin.</strong>
</div>
