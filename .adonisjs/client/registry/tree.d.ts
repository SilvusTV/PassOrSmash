/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  home: typeof routes['home'] & {
    robots: typeof routes['home.robots']
    sitemap: typeof routes['home.sitemap']
  }
  explore: typeof routes['explore']
  playlists: {
    show: typeof routes['playlists.show']
    index: typeof routes['playlists.index']
    create: typeof routes['playlists.create']
    store: typeof routes['playlists.store']
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
  uploads: {
    images: {
      store: typeof routes['uploads.images.store']
    }
  }
}
