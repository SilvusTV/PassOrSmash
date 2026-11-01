/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'admin.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['index']>>>
    }
  }
  'admin.users': {
    methods: ["GET","HEAD"]
    pattern: '/admin/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['users']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['users']>>>
    }
  }
  'admin.user': {
    methods: ["GET","HEAD"]
    pattern: '/admin/users/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['user']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['user']>>>
    }
  }
  'admin.suspend': {
    methods: ["POST"]
    pattern: '/admin/users/:id/status'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['suspend']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['suspend']>>>
    }
  }
  'admin.playlists': {
    methods: ["GET","HEAD"]
    pattern: '/admin/playlists'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['playlists']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['playlists']>>>
    }
  }
  'admin.playlist': {
    methods: ["GET","HEAD"]
    pattern: '/admin/playlists/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['playlist']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['playlist']>>>
    }
  }
  'admin.update_playlist': {
    methods: ["POST"]
    pattern: '/admin/playlists/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['updatePlaylist']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['updatePlaylist']>>>
    }
  }
  'admin.delete_playlist': {
    methods: ["POST"]
    pattern: '/admin/playlists/:id/delete'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['deletePlaylist']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['deletePlaylist']>>>
    }
  }
  'oauth.metadata': {
    methods: ["GET","HEAD"]
    pattern: '/.well-known/oauth-authorization-server'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['metadata']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['metadata']>>>
    }
  }
  'oauth.openidMetadata': {
    methods: ["GET","HEAD"]
    pattern: '/.well-known/openid-configuration'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['metadata']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['metadata']>>>
    }
  }
  'oauth.interaction': {
    methods: ["GET","HEAD"]
    pattern: '/oauth/interaction/:uid'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { uid: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['interaction']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['interaction']>>>
    }
  }
  'oauth.decision': {
    methods: ["POST"]
    pattern: '/oauth/interaction/:uid'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { uid: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['decision']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['decision']>>>
    }
  }
  'mcp.resourceMetadata': {
    methods: ["GET","HEAD"]
    pattern: '/.well-known/oauth-protected-resource/mcp'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['metadata']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['metadata']>>>
    }
  }
  'mcp.rootMetadata': {
    methods: ["GET","HEAD"]
    pattern: '/.well-known/oauth-protected-resource'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['metadata']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['metadata']>>>
    }
  }
  'mcp': {
    methods: ["GET","POST","DELETE"]
    pattern: '/mcp'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mcp_controller').default['handle']>>>
    }
  }
  'editorial.media': {
    methods: ["GET","HEAD"]
    pattern: '/editorial/media/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['media']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['media']>>>
    }
  }
  'editorial.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/editorial'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['index']>>>
    }
  }
  'editorial.settings': {
    methods: ["POST"]
    pattern: '/admin/editorial/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['settings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['settings']>>>
    }
  }
  'editorial.connection': {
    methods: ["POST"]
    pattern: '/admin/editorial/connections'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['connection']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['connection']>>>
    }
  }
  'editorial.revoke': {
    methods: ["POST"]
    pattern: '/admin/editorial/connections/:id/revoke'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['revoke']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['revoke']>>>
    }
  }
  'editorial.retry': {
    methods: ["POST"]
    pattern: '/admin/editorial/jobs/:id/retry'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['retry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['retry']>>>
    }
  }
  'editorial.generate': {
    methods: ["POST"]
    pattern: '/admin/editorial/generate'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['generate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['generate']>>>
    }
  }
  'editorial.create': {
    methods: ["POST"]
    pattern: '/admin/editorial/proposals'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['create']>>>
    }
  }
  'editorial.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/editorial/proposals/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['show']>>>
    }
  }
  'editorial.action': {
    methods: ["POST"]
    pattern: '/admin/editorial/proposals/:id/:action'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; action: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['action']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editorial_controller').default['action']>>>
    }
  }
  'home': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['index']>>>
    }
  }
  'about': {
    methods: ["GET","HEAD"]
    pattern: '/jeu-smash-or-pass'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['about']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['about']>>>
    }
  }
  'explore': {
    methods: ["GET","HEAD"]
    pattern: '/explore'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['explore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['explore']>>>
    }
  }
  'home.robots': {
    methods: ["GET","HEAD"]
    pattern: '/robots.txt'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['robots']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['robots']>>>
    }
  }
  'home.sitemap': {
    methods: ["GET","HEAD"]
    pattern: '/sitemap.xml'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['sitemap']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['sitemap']>>>
    }
  }
  'playlists.show': {
    methods: ["GET","HEAD"]
    pattern: '/p/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['show']>>>
    }
  }
  'votes.store': {
    methods: ["POST"]
    pattern: '/vote'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/vote').voteValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/vote').voteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vote_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vote_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.discord': {
    methods: ["GET","HEAD"]
    pattern: '/auth/discord'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/discord_auth_controller').default['redirect']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/discord_auth_controller').default['redirect']>>>
    }
  }
  'discord_auth.callback': {
    methods: ["GET","HEAD"]
    pattern: '/auth/discord/callback'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/discord_auth_controller').default['callback']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/discord_auth_controller').default['callback']>>>
    }
  }
  'auth.error': {
    methods: ["GET","HEAD"]
    pattern: '/auth/error'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/discord_auth_controller').default['error']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/discord_auth_controller').default['error']>>>
    }
  }
  'new_account.create': {
    methods: ["GET","HEAD"]
    pattern: '/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
    }
  }
  'new_account.store': {
    methods: ["POST"]
    pattern: '/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.create': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
    }
  }
  'session.store': {
    methods: ["POST"]
    pattern: '/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'playlists.index': {
    methods: ["GET","HEAD"]
    pattern: '/dashboard'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['index']>>>
    }
  }
  'playlists.create': {
    methods: ["GET","HEAD"]
    pattern: '/playlists/create'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['create']>>>
    }
  }
  'playlists.store': {
    methods: ["POST"]
    pattern: '/playlists'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/playlist').createPlaylistValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/playlist').createPlaylistValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'playlists.import': {
    methods: ["POST"]
    pattern: '/playlists/import'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/playlist').importPlaylistsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/playlist').importPlaylistsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['import']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['import']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'uploads.images.store': {
    methods: ["POST"]
    pattern: '/uploads/images'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/upload_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/upload_controller').default['store']>>>
    }
  }
  'playlists.edit': {
    methods: ["GET","HEAD"]
    pattern: '/p/:slug/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['edit']>>>
    }
  }
  'playlists.update': {
    methods: ["PUT"]
    pattern: '/p/:slug'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/playlist').createPlaylistValidator)>>
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/playlist').createPlaylistValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'playlists.destroy': {
    methods: ["DELETE"]
    pattern: '/p/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/playlists_controller').default['destroy']>>>
    }
  }
  'auth.logout': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/discord_auth_controller').default['logout']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/discord_auth_controller').default['logout']>>>
    }
  }
}
