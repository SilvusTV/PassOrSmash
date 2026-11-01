/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Link, router } from '@inertiajs/react'
import { useState } from 'react'
import AdminShell, { PlaylistsTable } from '~/components/admin'
import {
  accountName,
  adminDate,
  type Account,
  type Pagination,
  type PlaylistSummary,
} from '~/admin_types'

export default function AdminUser(props: {
  account: Account
  playlists: PlaylistSummary[]
  pagination: Pagination
}) {
  return <AccountDetail key={`${props.account.id}:${props.account.suspendedAt}`} {...props} />
}
function AccountDetail({
  account,
  playlists,
  pagination,
}: {
  account: Account
  playlists: PlaylistSummary[]
  pagination: Pagination
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <AdminShell title={accountName(account)} description={`Compte #${account.id}`}>
      <Link href="/admin/users">← Tous les comptes</Link>
      <section className="admin-panel">
        <h2>Informations du compte</h2>
        <dl className="admin-details">
          <div>
            <dt>E-mail</dt>
            <dd>{account.email}</dd>
          </div>
          <div>
            <dt>Pseudo Discord</dt>
            <dd>{account.username || '—'}</dd>
          </div>
          <div>
            <dt>Identifiant Discord</dt>
            <dd>{account.discordId || '—'}</dd>
          </div>
          <div>
            <dt>Inscription</dt>
            <dd>{adminDate(account.createdAt)}</dd>
          </div>
          <div>
            <dt>Statut</dt>
            <dd>
              {account.suspendedAt
                ? `Suspendu depuis le ${adminDate(account.suspendedAt)}`
                : 'Actif'}
              {account.isAdmin ? ' · Administrateur' : ''}
            </dd>
          </div>
          <div>
            <dt>Playlists créées</dt>
            <dd>
              {account.playlistCount} ({account.publicCount} publiques · {account.privateCount}{' '}
              privées)
            </dd>
          </div>
          <div>
            <dt>Votes émis avec ce compte</dt>
            <dd>{account.voteCount}</dd>
          </div>
        </dl>
      </section>
      <section className="admin-panel">
        <h2>Accès au compte</h2>
        {account.isAdmin ? (
          <p>
            Les droits des administrateurs sont définis sur le serveur. Leur suspension est protégée
            pour éviter un verrouillage de l’administration.
          </p>
        ) : (
          <>
            <p>
              {account.suspendedAt
                ? 'La réactivation permettra à nouveau la connexion. Les accès MCP révoqués ne seront pas rétablis automatiquement.'
                : 'La suspension déconnecte le compte au prochain accès et empêche une nouvelle connexion. Ses playlists et ses votes sont conservés.'}
            </p>
            <form
              className="admin-form"
              onSubmit={(event) => {
                event.preventDefault()
                setBusy(true)
                router.post(
                  `/admin/users/${account.id}/status`,
                  {
                    suspended: !account.suspendedAt,
                    expected_suspended: !!account.suspendedAt,
                    reason,
                  },
                  { onFinish: () => setBusy(false) }
                )
              }}
            >
              <label>
                Motif
                <textarea
                  required
                  minLength={3}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <button
                className={`button ${account.suspendedAt ? 'button-primary' : 'admin-danger'}`}
                disabled={busy}
                type="submit"
              >
                {account.suspendedAt ? 'Réactiver le compte' : 'Suspendre ce compte'}
              </button>
            </form>
          </>
        )}
      </section>
      <section className="admin-panel">
        <div className="admin-section-heading">
          <h2>Playlists de ce compte</h2>
          <Link href={`/admin/playlists?user_id=${account.id}`}>
            Voir les {pagination.total} playlists →
          </Link>
        </div>
        <PlaylistsTable playlists={playlists} />
      </section>
    </AdminShell>
  )
}
