/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  googleAuth: {
    redirect: typeof routes['google_auth.redirect']
    callback: typeof routes['google_auth.callback']
  }
  admin: {
    index: typeof routes['admin.index']
    users: typeof routes['admin.users']
    user: typeof routes['admin.user']
    suspend: typeof routes['admin.suspend']
    playlists: typeof routes['admin.playlists']
    playlist: typeof routes['admin.playlist']
    updatePlaylist: typeof routes['admin.update_playlist']
    deletePlaylist: typeof routes['admin.delete_playlist']
  }
  oauth: {
    metadata: typeof routes['oauth.metadata']
    openidMetadata: typeof routes['oauth.openidMetadata']
    interaction: typeof routes['oauth.interaction']
    decision: typeof routes['oauth.decision']
  }
  mcp: typeof routes['mcp'] & {
    resourceMetadata: typeof routes['mcp.resourceMetadata']
    rootMetadata: typeof routes['mcp.rootMetadata']
  }
  editorial: {
    media: typeof routes['editorial.media']
    index: typeof routes['editorial.index']
    settings: typeof routes['editorial.settings']
    connection: typeof routes['editorial.connection']
    revoke: typeof routes['editorial.revoke']
    retry: typeof routes['editorial.retry']
    generate: typeof routes['editorial.generate']
    create: typeof routes['editorial.create']
    show: typeof routes['editorial.show']
    action: typeof routes['editorial.action']
  }
  home: typeof routes['home'] & {
    robots: typeof routes['home.robots']
    sitemap: typeof routes['home.sitemap']
  }
  about: typeof routes['about']
  explore: typeof routes['explore']
  playlists: {
    show: typeof routes['playlists.show']
    index: typeof routes['playlists.index']
    create: typeof routes['playlists.create']
    store: typeof routes['playlists.store']
    import: typeof routes['playlists.import']
    edit: typeof routes['playlists.edit']
    update: typeof routes['playlists.update']
    destroy: typeof routes['playlists.destroy']
  }
  votes: {
    store: typeof routes['votes.store']
  }
  auth: {
    discord: typeof routes['auth.discord']
    error: typeof routes['auth.error']
    logout: typeof routes['auth.logout']
  }
  discordAuth: {
    callback: typeof routes['discord_auth.callback']
  }
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
  }
  profile: {
    show: typeof routes['profile.show']
  }
  uploads: {
    images: {
      store: typeof routes['uploads.images.store']
    }
  }
}
