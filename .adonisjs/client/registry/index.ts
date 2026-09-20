/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
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
