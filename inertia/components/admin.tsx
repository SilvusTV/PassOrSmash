/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Head, Link, usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'
import {
  adminDate,
  accountName,
  type Account,
  type Pagination,
  type PlaylistSummary,
} from '~/admin_types'

export function AdminNav() {
  const { url } = usePage()
  return (
    <nav className="admin-nav" aria-label="Administration">
      {[
        { url: '/admin', label: 'Vue d’ensemble' },
        { url: '/admin/users', label: 'Comptes' },
        { url: '/admin/playlists', label: 'Playlists' },
        { url: '/admin/editorial', label: 'Studio éditorial' },
      ].map((entry) => (
        <Link
          key={entry.url}
          href={entry.url}
          aria-current={
            (entry.url === '/admin' ? url.split('?')[0] === '/admin' : url.startsWith(entry.url))
              ? 'page'
              : undefined
          }
        >
          {entry.label}
        </Link>
      ))}
    </nav>
  )
}
export default function AdminShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <>
      <Head title={`${title} — Administration`}>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="admin-shell">
        <header className="admin-header">
          <span className="eyebrow">Administration PassOrSmash</span>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </header>
        <AdminNav />
        {children}
      </div>
    </>
  )
}
export function Pages({
  pagination,
  base,
  params = {},
}: {
  pagination: Pagination
  base: string
  params?: Record<string, string | number | undefined>
}) {
  const href = (page: number) => {
    const values: Record<string, string | number | undefined> = { ...params, page }
    return `${base}?${new URLSearchParams(
      Object.entries(values)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)])
    )}`
  }
  return (
    <nav className="admin-pagination" aria-label="Pagination">
      <span>
        {pagination.total} résultat(s) · page {pagination.page} sur {pagination.lastPage}
      </span>
      <div>
        {pagination.page > 1 && <Link href={href(pagination.page - 1)}>← Précédente</Link>}
        {pagination.page < pagination.lastPage && (
          <Link href={href(pagination.page + 1)}>Suivante →</Link>
        )}
      </div>
    </nav>
  )
}
export function AccountsTable({ users }: { users: Account[] }) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Compte</th>
            <th>Statut</th>
            <th>Playlists</th>
            <th>Votes émis</th>
            <th>Inscription</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <Link href={`/admin/users/${user.id}`}>{accountName(user)}</Link>
                <small>{user.email}</small>
                {user.username && <small>@{user.username}</small>}
              </td>
              <td>
                <span className={`admin-badge ${user.suspendedAt ? 'suspended' : ''}`}>
                  {user.suspendedAt ? 'Suspendu' : 'Actif'}
                </span>
                {user.isAdmin && <small>Administrateur</small>}
              </td>
              <td>
                {user.playlistCount}
                <small>
                  {user.publicCount} publiques · {user.privateCount} privées
                </small>
              </td>
              <td>{user.voteCount}</td>
              <td>{adminDate(user.createdAt)}</td>
            </tr>
          ))}
          {!users.length && (
            <tr>
              <td colSpan={5}>Aucun compte ne correspond à ces critères.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
export function PlaylistsTable({ playlists }: { playlists: PlaylistSummary[] }) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Playlist</th>
            <th>Créateur</th>
            <th>Visibilité</th>
            <th>Éléments</th>
            <th>Votes</th>
            <th>Création</th>
          </tr>
        </thead>
        <tbody>
          {playlists.map((playlist) => (
            <tr key={playlist.id}>
              <td>
                <Link href={`/admin/playlists/${playlist.id}`}>{playlist.title}</Link>
                <small>{playlist.slug}</small>
              </td>
              <td>
                <Link href={`/admin/users/${playlist.userId}`}>{playlist.ownerName}</Link>
              </td>
              <td>
                <span className={`admin-badge ${playlist.isPublic ? 'public' : 'private'}`}>
                  {playlist.isPublic ? 'Publique' : 'Privée'}
                </span>
              </td>
              <td>{playlist.itemCount}</td>
              <td>{playlist.voteCount}</td>
              <td>{adminDate(playlist.createdAt)}</td>
            </tr>
          ))}
          {!playlists.length && (
            <tr>
              <td colSpan={6}>Aucune playlist ne correspond à ces critères.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
