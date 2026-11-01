/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Link } from '@inertiajs/react'
import AdminShell, { PlaylistsTable, Pages } from '~/components/admin'
import type { PlaylistSummary, Pagination } from '~/admin_types'

export default function AdminPlaylists({
  playlists,
  pagination,
  filters,
}: {
  playlists: PlaylistSummary[]
  pagination: Pagination
  filters: { q: string; visibility: string; user_id?: number }
}) {
  return (
    <AdminShell
      title="Playlists"
      description="Gérez toutes les playlists du site, y compris celles qui sont privées."
    >
      <section className="admin-panel">
        <form method="get" action="/admin/playlists" className="admin-filters">
          <label>
            Rechercher une playlist
            <input
              name="q"
              defaultValue={filters.q}
              maxLength={120}
              placeholder="Titre ou créateur"
            />
          </label>
          <label>
            Visibilité
            <select name="visibility" defaultValue={filters.visibility}>
              <option value="all">Publiques et privées</option>
              <option value="public">Publiques</option>
              <option value="private">Privées</option>
            </select>
          </label>
          {filters.user_id && <input type="hidden" name="user_id" value={filters.user_id} />}
          <button className="button" type="submit">
            Rechercher
          </button>
        </form>
        {filters.user_id && (
          <p>
            Playlists du compte #{filters.user_id}.{' '}
            <Link href="/admin/playlists">Afficher tous les créateurs</Link>
          </p>
        )}
        <PlaylistsTable playlists={playlists} />
        <Pages pagination={pagination} base="/admin/playlists" params={filters} />
      </section>
    </AdminShell>
  )
}
