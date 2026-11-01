import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'oauth.metadata': { paramsTuple?: []; params?: {} }
    'oauth.openidMetadata': { paramsTuple?: []; params?: {} }
    'oauth.interaction': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'oauth.decision': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'mcp.resourceMetadata': { paramsTuple?: []; params?: {} }
    'mcp.rootMetadata': { paramsTuple?: []; params?: {} }
    'mcp': { paramsTuple?: []; params?: {} }
    'editorial.media': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'editorial.index': { paramsTuple?: []; params?: {} }
    'editorial.settings': { paramsTuple?: []; params?: {} }
    'editorial.connection': { paramsTuple?: []; params?: {} }
    'editorial.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'editorial.retry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'editorial.generate': { paramsTuple?: []; params?: {} }
    'editorial.create': { paramsTuple?: []; params?: {} }
    'editorial.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'editorial.action': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'action': ParamValue} }
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
    'playlists.import': { paramsTuple?: []; params?: {} }
    'uploads.images.store': { paramsTuple?: []; params?: {} }
    'playlists.edit': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'playlists.update': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'playlists.destroy': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'auth.logout': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'oauth.metadata': { paramsTuple?: []; params?: {} }
    'oauth.openidMetadata': { paramsTuple?: []; params?: {} }
    'oauth.interaction': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'mcp.resourceMetadata': { paramsTuple?: []; params?: {} }
    'mcp.rootMetadata': { paramsTuple?: []; params?: {} }
    'mcp': { paramsTuple?: []; params?: {} }
    'editorial.media': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'editorial.index': { paramsTuple?: []; params?: {} }
    'editorial.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'oauth.metadata': { paramsTuple?: []; params?: {} }
    'oauth.openidMetadata': { paramsTuple?: []; params?: {} }
    'oauth.interaction': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'mcp.resourceMetadata': { paramsTuple?: []; params?: {} }
    'mcp.rootMetadata': { paramsTuple?: []; params?: {} }
    'editorial.media': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'editorial.index': { paramsTuple?: []; params?: {} }
    'editorial.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'oauth.decision': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'mcp': { paramsTuple?: []; params?: {} }
    'editorial.settings': { paramsTuple?: []; params?: {} }
    'editorial.connection': { paramsTuple?: []; params?: {} }
    'editorial.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'editorial.retry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'editorial.generate': { paramsTuple?: []; params?: {} }
    'editorial.create': { paramsTuple?: []; params?: {} }
    'editorial.action': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'action': ParamValue} }
    'votes.store': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'playlists.store': { paramsTuple?: []; params?: {} }
    'playlists.import': { paramsTuple?: []; params?: {} }
    'uploads.images.store': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'mcp': { paramsTuple?: []; params?: {} }
    'playlists.destroy': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
  }
  PUT: {
    'playlists.update': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}