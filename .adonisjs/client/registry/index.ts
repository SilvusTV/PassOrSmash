/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'admin.index': {
    methods: ["GET","HEAD"],
    pattern: '/admin',
    tokens: [{"old":"/admin","type":0,"val":"admin","end":""}],
    types: placeholder as Registry['admin.index']['types'],
  },
  'admin.users': {
    methods: ["GET","HEAD"],
    pattern: '/admin/users',
    tokens: [{"old":"/admin/users","type":0,"val":"admin","end":""},{"old":"/admin/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['admin.users']['types'],
  },
  'admin.user': {
    methods: ["GET","HEAD"],
    pattern: '/admin/users/:id',
    tokens: [{"old":"/admin/users/:id","type":0,"val":"admin","end":""},{"old":"/admin/users/:id","type":0,"val":"users","end":""},{"old":"/admin/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['admin.user']['types'],
  },
  'admin.suspend': {
    methods: ["POST"],
    pattern: '/admin/users/:id/status',
    tokens: [{"old":"/admin/users/:id/status","type":0,"val":"admin","end":""},{"old":"/admin/users/:id/status","type":0,"val":"users","end":""},{"old":"/admin/users/:id/status","type":1,"val":"id","end":""},{"old":"/admin/users/:id/status","type":0,"val":"status","end":""}],
    types: placeholder as Registry['admin.suspend']['types'],
  },
  'admin.playlists': {
    methods: ["GET","HEAD"],
    pattern: '/admin/playlists',
    tokens: [{"old":"/admin/playlists","type":0,"val":"admin","end":""},{"old":"/admin/playlists","type":0,"val":"playlists","end":""}],
    types: placeholder as Registry['admin.playlists']['types'],
  },
  'admin.playlist': {
    methods: ["GET","HEAD"],
    pattern: '/admin/playlists/:id',
    tokens: [{"old":"/admin/playlists/:id","type":0,"val":"admin","end":""},{"old":"/admin/playlists/:id","type":0,"val":"playlists","end":""},{"old":"/admin/playlists/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['admin.playlist']['types'],
  },
  'admin.update_playlist': {
    methods: ["POST"],
    pattern: '/admin/playlists/:id',
    tokens: [{"old":"/admin/playlists/:id","type":0,"val":"admin","end":""},{"old":"/admin/playlists/:id","type":0,"val":"playlists","end":""},{"old":"/admin/playlists/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['admin.update_playlist']['types'],
  },
  'admin.delete_playlist': {
    methods: ["POST"],
    pattern: '/admin/playlists/:id/delete',
    tokens: [{"old":"/admin/playlists/:id/delete","type":0,"val":"admin","end":""},{"old":"/admin/playlists/:id/delete","type":0,"val":"playlists","end":""},{"old":"/admin/playlists/:id/delete","type":1,"val":"id","end":""},{"old":"/admin/playlists/:id/delete","type":0,"val":"delete","end":""}],
    types: placeholder as Registry['admin.delete_playlist']['types'],
  },
  'oauth.metadata': {
    methods: ["GET","HEAD"],
    pattern: '/.well-known/oauth-authorization-server',
    tokens: [{"old":"/.well-known/oauth-authorization-server","type":0,"val":".well-known","end":""},{"old":"/.well-known/oauth-authorization-server","type":0,"val":"oauth-authorization-server","end":""}],
    types: placeholder as Registry['oauth.metadata']['types'],
  },
  'oauth.openidMetadata': {
    methods: ["GET","HEAD"],
    pattern: '/.well-known/openid-configuration',
    tokens: [{"old":"/.well-known/openid-configuration","type":0,"val":".well-known","end":""},{"old":"/.well-known/openid-configuration","type":0,"val":"openid-configuration","end":""}],
    types: placeholder as Registry['oauth.openidMetadata']['types'],
  },
  'oauth.interaction': {
    methods: ["GET","HEAD"],
    pattern: '/oauth/interaction/:uid',
    tokens: [{"old":"/oauth/interaction/:uid","type":0,"val":"oauth","end":""},{"old":"/oauth/interaction/:uid","type":0,"val":"interaction","end":""},{"old":"/oauth/interaction/:uid","type":1,"val":"uid","end":""}],
    types: placeholder as Registry['oauth.interaction']['types'],
  },
  'oauth.decision': {
    methods: ["POST"],
    pattern: '/oauth/interaction/:uid',
    tokens: [{"old":"/oauth/interaction/:uid","type":0,"val":"oauth","end":""},{"old":"/oauth/interaction/:uid","type":0,"val":"interaction","end":""},{"old":"/oauth/interaction/:uid","type":1,"val":"uid","end":""}],
    types: placeholder as Registry['oauth.decision']['types'],
  },
  'mcp.resourceMetadata': {
    methods: ["GET","HEAD"],
    pattern: '/.well-known/oauth-protected-resource/mcp',
    tokens: [{"old":"/.well-known/oauth-protected-resource/mcp","type":0,"val":".well-known","end":""},{"old":"/.well-known/oauth-protected-resource/mcp","type":0,"val":"oauth-protected-resource","end":""},{"old":"/.well-known/oauth-protected-resource/mcp","type":0,"val":"mcp","end":""}],
    types: placeholder as Registry['mcp.resourceMetadata']['types'],
  },
  'mcp.rootMetadata': {
    methods: ["GET","HEAD"],
    pattern: '/.well-known/oauth-protected-resource',
    tokens: [{"old":"/.well-known/oauth-protected-resource","type":0,"val":".well-known","end":""},{"old":"/.well-known/oauth-protected-resource","type":0,"val":"oauth-protected-resource","end":""}],
    types: placeholder as Registry['mcp.rootMetadata']['types'],
  },
  'mcp': {
    methods: ["GET","POST","DELETE"],
    pattern: '/mcp',
    tokens: [{"old":"/mcp","type":0,"val":"mcp","end":""}],
    types: placeholder as Registry['mcp']['types'],
  },
  'editorial.media': {
    methods: ["GET","HEAD"],
    pattern: '/editorial/media/:id',
    tokens: [{"old":"/editorial/media/:id","type":0,"val":"editorial","end":""},{"old":"/editorial/media/:id","type":0,"val":"media","end":""},{"old":"/editorial/media/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['editorial.media']['types'],
  },
  'editorial.index': {
    methods: ["GET","HEAD"],
    pattern: '/admin/editorial',
    tokens: [{"old":"/admin/editorial","type":0,"val":"admin","end":""},{"old":"/admin/editorial","type":0,"val":"editorial","end":""}],
    types: placeholder as Registry['editorial.index']['types'],
  },
  'editorial.settings': {
    methods: ["POST"],
    pattern: '/admin/editorial/settings',
    tokens: [{"old":"/admin/editorial/settings","type":0,"val":"admin","end":""},{"old":"/admin/editorial/settings","type":0,"val":"editorial","end":""},{"old":"/admin/editorial/settings","type":0,"val":"settings","end":""}],
    types: placeholder as Registry['editorial.settings']['types'],
  },
  'editorial.connection': {
    methods: ["POST"],
    pattern: '/admin/editorial/connections',
    tokens: [{"old":"/admin/editorial/connections","type":0,"val":"admin","end":""},{"old":"/admin/editorial/connections","type":0,"val":"editorial","end":""},{"old":"/admin/editorial/connections","type":0,"val":"connections","end":""}],
    types: placeholder as Registry['editorial.connection']['types'],
  },
  'editorial.revoke': {
    methods: ["POST"],
    pattern: '/admin/editorial/connections/:id/revoke',
    tokens: [{"old":"/admin/editorial/connections/:id/revoke","type":0,"val":"admin","end":""},{"old":"/admin/editorial/connections/:id/revoke","type":0,"val":"editorial","end":""},{"old":"/admin/editorial/connections/:id/revoke","type":0,"val":"connections","end":""},{"old":"/admin/editorial/connections/:id/revoke","type":1,"val":"id","end":""},{"old":"/admin/editorial/connections/:id/revoke","type":0,"val":"revoke","end":""}],
    types: placeholder as Registry['editorial.revoke']['types'],
  },
  'editorial.retry': {
    methods: ["POST"],
    pattern: '/admin/editorial/jobs/:id/retry',
    tokens: [{"old":"/admin/editorial/jobs/:id/retry","type":0,"val":"admin","end":""},{"old":"/admin/editorial/jobs/:id/retry","type":0,"val":"editorial","end":""},{"old":"/admin/editorial/jobs/:id/retry","type":0,"val":"jobs","end":""},{"old":"/admin/editorial/jobs/:id/retry","type":1,"val":"id","end":""},{"old":"/admin/editorial/jobs/:id/retry","type":0,"val":"retry","end":""}],
    types: placeholder as Registry['editorial.retry']['types'],
  },
  'editorial.generate': {
    methods: ["POST"],
    pattern: '/admin/editorial/generate',
    tokens: [{"old":"/admin/editorial/generate","type":0,"val":"admin","end":""},{"old":"/admin/editorial/generate","type":0,"val":"editorial","end":""},{"old":"/admin/editorial/generate","type":0,"val":"generate","end":""}],
    types: placeholder as Registry['editorial.generate']['types'],
  },
  'editorial.create': {
    methods: ["POST"],
    pattern: '/admin/editorial/proposals',
    tokens: [{"old":"/admin/editorial/proposals","type":0,"val":"admin","end":""},{"old":"/admin/editorial/proposals","type":0,"val":"editorial","end":""},{"old":"/admin/editorial/proposals","type":0,"val":"proposals","end":""}],
    types: placeholder as Registry['editorial.create']['types'],
  },
  'editorial.show': {
    methods: ["GET","HEAD"],
    pattern: '/admin/editorial/proposals/:id',
    tokens: [{"old":"/admin/editorial/proposals/:id","type":0,"val":"admin","end":""},{"old":"/admin/editorial/proposals/:id","type":0,"val":"editorial","end":""},{"old":"/admin/editorial/proposals/:id","type":0,"val":"proposals","end":""},{"old":"/admin/editorial/proposals/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['editorial.show']['types'],
  },
  'editorial.action': {
    methods: ["POST"],
    pattern: '/admin/editorial/proposals/:id/:action',
    tokens: [{"old":"/admin/editorial/proposals/:id/:action","type":0,"val":"admin","end":""},{"old":"/admin/editorial/proposals/:id/:action","type":0,"val":"editorial","end":""},{"old":"/admin/editorial/proposals/:id/:action","type":0,"val":"proposals","end":""},{"old":"/admin/editorial/proposals/:id/:action","type":1,"val":"id","end":""},{"old":"/admin/editorial/proposals/:id/:action","type":1,"val":"action","end":""}],
    types: placeholder as Registry['editorial.action']['types'],
  },
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['home']['types'],
  },
  'about': {
    methods: ["GET","HEAD"],
    pattern: '/jeu-smash-or-pass',
    tokens: [{"old":"/jeu-smash-or-pass","type":0,"val":"jeu-smash-or-pass","end":""}],
    types: placeholder as Registry['about']['types'],
  },
  'explore': {
    methods: ["GET","HEAD"],
    pattern: '/explore',
    tokens: [{"old":"/explore","type":0,"val":"explore","end":""}],
    types: placeholder as Registry['explore']['types'],
  },
  'home.robots': {
    methods: ["GET","HEAD"],
    pattern: '/robots.txt',
    tokens: [{"old":"/robots.txt","type":0,"val":"robots.txt","end":""}],
    types: placeholder as Registry['home.robots']['types'],
  },
  'home.sitemap': {
    methods: ["GET","HEAD"],
    pattern: '/sitemap.xml',
    tokens: [{"old":"/sitemap.xml","type":0,"val":"sitemap.xml","end":""}],
    types: placeholder as Registry['home.sitemap']['types'],
  },
  'playlists.show': {
    methods: ["GET","HEAD"],
    pattern: '/p/:slug',
    tokens: [{"old":"/p/:slug","type":0,"val":"p","end":""},{"old":"/p/:slug","type":1,"val":"slug","end":""}],
    types: placeholder as Registry['playlists.show']['types'],
  },
  'votes.store': {
    methods: ["POST"],
    pattern: '/vote',
    tokens: [{"old":"/vote","type":0,"val":"vote","end":""}],
    types: placeholder as Registry['votes.store']['types'],
  },
  'auth.discord': {
    methods: ["GET","HEAD"],
    pattern: '/auth/discord',
    tokens: [{"old":"/auth/discord","type":0,"val":"auth","end":""},{"old":"/auth/discord","type":0,"val":"discord","end":""}],
    types: placeholder as Registry['auth.discord']['types'],
  },
  'discord_auth.callback': {
    methods: ["GET","HEAD"],
    pattern: '/auth/discord/callback',
    tokens: [{"old":"/auth/discord/callback","type":0,"val":"auth","end":""},{"old":"/auth/discord/callback","type":0,"val":"discord","end":""},{"old":"/auth/discord/callback","type":0,"val":"callback","end":""}],
    types: placeholder as Registry['discord_auth.callback']['types'],
  },
  'auth.error': {
    methods: ["GET","HEAD"],
    pattern: '/auth/error',
    tokens: [{"old":"/auth/error","type":0,"val":"auth","end":""},{"old":"/auth/error","type":0,"val":"error","end":""}],
    types: placeholder as Registry['auth.error']['types'],
  },
  'new_account.create': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.create']['types'],
  },
  'new_account.store': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.store']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.store']['types'],
  },
  'playlists.index': {
    methods: ["GET","HEAD"],
    pattern: '/dashboard',
    tokens: [{"old":"/dashboard","type":0,"val":"dashboard","end":""}],
    types: placeholder as Registry['playlists.index']['types'],
  },
  'playlists.create': {
    methods: ["GET","HEAD"],
    pattern: '/playlists/create',
    tokens: [{"old":"/playlists/create","type":0,"val":"playlists","end":""},{"old":"/playlists/create","type":0,"val":"create","end":""}],
    types: placeholder as Registry['playlists.create']['types'],
  },
  'playlists.store': {
    methods: ["POST"],
    pattern: '/playlists',
    tokens: [{"old":"/playlists","type":0,"val":"playlists","end":""}],
    types: placeholder as Registry['playlists.store']['types'],
  },
  'playlists.import': {
    methods: ["POST"],
    pattern: '/playlists/import',
    tokens: [{"old":"/playlists/import","type":0,"val":"playlists","end":""},{"old":"/playlists/import","type":0,"val":"import","end":""}],
    types: placeholder as Registry['playlists.import']['types'],
  },
  'uploads.images.store': {
    methods: ["POST"],
    pattern: '/uploads/images',
    tokens: [{"old":"/uploads/images","type":0,"val":"uploads","end":""},{"old":"/uploads/images","type":0,"val":"images","end":""}],
    types: placeholder as Registry['uploads.images.store']['types'],
  },
  'playlists.edit': {
    methods: ["GET","HEAD"],
    pattern: '/p/:slug/edit',
    tokens: [{"old":"/p/:slug/edit","type":0,"val":"p","end":""},{"old":"/p/:slug/edit","type":1,"val":"slug","end":""},{"old":"/p/:slug/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['playlists.edit']['types'],
  },
  'playlists.update': {
    methods: ["PUT"],
    pattern: '/p/:slug',
    tokens: [{"old":"/p/:slug","type":0,"val":"p","end":""},{"old":"/p/:slug","type":1,"val":"slug","end":""}],
    types: placeholder as Registry['playlists.update']['types'],
  },
  'playlists.destroy': {
    methods: ["DELETE"],
    pattern: '/p/:slug',
    tokens: [{"old":"/p/:slug","type":0,"val":"p","end":""},{"old":"/p/:slug","type":1,"val":"slug","end":""}],
    types: placeholder as Registry['playlists.destroy']['types'],
  },
  'auth.logout': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['auth.logout']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
