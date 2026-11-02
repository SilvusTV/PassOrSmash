import db from '@adonisjs/lucid/services/db'
import Playlist from '#models/playlist'

/** One game per session with at least one vote; historical votes group by visitor. */
export function playlistsWithActivity() {
  return Playlist.query()
    .select('playlists.*')
    .select(
      db.raw(`(select count(distinct (v.visitor_id, v.session_id))::int
      from votes v join playlist_items i on i.id = v.playlist_item_id
      where i.playlist_id = playlists.id) as participation_count`)
    )
}
