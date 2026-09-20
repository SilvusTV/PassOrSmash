import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'about': { paramsTuple?: []; params?: {} }
    'explore': { paramsTuple?: []; params?: {} }
    'home.robots': { paramsTuple?: []; params?: {} }
    'home.sitemap': { paramsTuple?: []; params?: {} }
    'playlists.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'votes.store': { paramsTuple?: []; params?: {} }
    'auth.discord': { paramsTuple?: []; params?: {} }
    'discord_auth.callback': { paramsTuple?: []; params?: {} }
    'auth.error': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'playlists.index': { paramsTuple?: []; params?: {} }
    'playlists.create': { paramsTuple?: []; params?: {} }
    'playlists.store': { paramsTuple?: []; params?: {} }
    'uploads.images.store': { paramsTuple?: []; params?: {} }
    'playlists.edit': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'playlists.update': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'playlists.destroy': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'auth.logout': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'about': { paramsTuple?: []; params?: {} }
    'explore': { paramsTuple?: []; params?: {} }
    'home.robots': { paramsTuple?: []; params?: {} }
    'home.sitemap': { paramsTuple?: []; params?: {} }
    'playlists.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'auth.discord': { paramsTuple?: []; params?: {} }
    'discord_auth.callback': { paramsTuple?: []; params?: {} }
    'auth.error': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'playlists.index': { paramsTuple?: []; params?: {} }
    'playlists.create': { paramsTuple?: []; params?: {} }
    'playlists.edit': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'about': { paramsTuple?: []; params?: {} }
    'explore': { paramsTuple?: []; params?: {} }
    'home.robots': { paramsTuple?: []; params?: {} }
    'home.sitemap': { paramsTuple?: []; params?: {} }
    'playlists.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'auth.discord': { paramsTuple?: []; params?: {} }
    'discord_auth.callback': { paramsTuple?: []; params?: {} }
    'auth.error': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'playlists.index': { paramsTuple?: []; params?: {} }
    'playlists.create': { paramsTuple?: []; params?: {} }
    'playlists.edit': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
  }
  POST: {
    'votes.store': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'playlists.store': { paramsTuple?: []; params?: {} }
    'uploads.images.store': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'playlists.update': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
  }
  DELETE: {
    'playlists.destroy': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}