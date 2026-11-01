/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
const McpController = () => import('#controllers/mcp_controller')
const EditorialController = () => import('#controllers/editorial_controller')
const OauthController = () => import('#controllers/oauth_controller')
const AdminController = () => import('#controllers/admin_controller')
router
  .group(() => {
    router.get('/', [AdminController, 'index'])
    router.get('/users', [AdminController, 'users'])
    router.get('/users/:id', [AdminController, 'user'])
    router.post('/users/:id/status', [AdminController, 'suspend'])
    router.get('/playlists', [AdminController, 'playlists'])
    router.get('/playlists/:id', [AdminController, 'playlist'])
    router.post('/playlists/:id', [AdminController, 'updatePlaylist'])
    router.post('/playlists/:id/delete', [AdminController, 'deletePlaylist'])
  })
  .prefix('/admin')
  .use([middleware.auth(), middleware.editorialAdmin()])
router
  .get('/.well-known/oauth-authorization-server', [OauthController, 'metadata'])
  .as('oauth.metadata')
router
  .get('/.well-known/openid-configuration', [OauthController, 'metadata'])
  .as('oauth.openidMetadata')
router.get('/oauth/interaction/:uid', [OauthController, 'interaction'])
router.post('/oauth/interaction/:uid', [OauthController, 'decision'])

router
  .get('/.well-known/oauth-protected-resource/mcp', [McpController, 'metadata'])
  .as('mcp.resourceMetadata')
router
  .get('/.well-known/oauth-protected-resource', [McpController, 'metadata'])
  .as('mcp.rootMetadata')
router.route('/mcp', ['GET', 'POST', 'DELETE'], [McpController, 'handle'])
router.get('/editorial/media/:id', [EditorialController, 'media'])
router
  .group(() => {
    router.get('/', [EditorialController, 'index'])
    router.post('/settings', [EditorialController, 'settings'])
    router.post('/connections', [EditorialController, 'connection'])
    router.post('/connections/:id/revoke', [EditorialController, 'revoke'])
    router.post('/jobs/:id/retry', [EditorialController, 'retry'])
    router.post('/generate', [EditorialController, 'generate'])
    router.post('/proposals', [EditorialController, 'create'])
    router.get('/proposals/:id', [EditorialController, 'show'])
    router.post('/proposals/:id/:action', [EditorialController, 'action'])
  })
  .prefix('/admin/editorial')
  .use([middleware.auth(), middleware.editorialAdmin()])

router.get('/', [controllers.Home, 'index']).as('home')
router.get('/jeu-smash-or-pass', [controllers.Home, 'about']).as('about')
router.get('/explore', [controllers.Home, 'explore']).as('explore')
router.get('/robots.txt', [controllers.Home, 'robots'])
router.get('/sitemap.xml', [controllers.Home, 'sitemap'])
router.get('/p/:slug', [controllers.Playlists, 'show']).as('playlists.show')
router.post('/vote', [controllers.Vote, 'store']).as('votes.store')
router.get('/auth/discord', [controllers.DiscordAuth, 'redirect']).as('auth.discord')
router.get('/auth/discord/callback', [controllers.DiscordAuth, 'callback'])
router.get('/auth/error', [controllers.DiscordAuth, 'error']).as('auth.error')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.get('/dashboard', [controllers.Playlists, 'index']).as('playlists.index')
    router.get('/playlists/create', [controllers.Playlists, 'create']).as('playlists.create')
    router.post('/playlists', [controllers.Playlists, 'store']).as('playlists.store')
    router.post('/playlists/import', [controllers.Playlists, 'import']).as('playlists.import')
    router.post('/uploads/images', [controllers.Upload, 'store']).as('uploads.images.store')
    router.get('/p/:slug/edit', [controllers.Playlists, 'edit']).as('playlists.edit')
    router.put('/p/:slug', [controllers.Playlists, 'update']).as('playlists.update')
    router.delete('/p/:slug', [controllers.Playlists, 'destroy']).as('playlists.destroy')
    router.post('/logout', [controllers.DiscordAuth, 'logout']).as('auth.logout')
  })
  .use(middleware.auth())
