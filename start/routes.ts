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

router.get('/', [controllers.Home, 'index']).as('home')
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
    router.get('/p/:slug/edit', [controllers.Playlists, 'edit']).as('playlists.edit')
    router.put('/p/:slug', [controllers.Playlists, 'update']).as('playlists.update')
    router.delete('/p/:slug', [controllers.Playlists, 'destroy']).as('playlists.destroy')
    router.post('/logout', [controllers.DiscordAuth, 'logout']).as('auth.logout')
  })
  .use(middleware.auth())
