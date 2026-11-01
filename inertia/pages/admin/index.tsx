/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Link } from '@inertiajs/react'
import AdminShell, { AccountsTable, PlaylistsTable } from '~/components/admin'
import { adminDate, type Account, type PlaylistSummary } from '~/admin_types'

type Totals = {
  accounts: number
  suspended: number
  new_accounts: number
  playlists: number
  public_playlists: number
  private_playlists: number
  items: number
  votes: number
  smashes: number
  participants: number
  pending_proposals: number
}
type Activity = { day: string; accounts: number; playlists: number; votes: number }
type Action = {
  id: string
  actor_name?: string
  actor_full_name?: string
  target_type: string
  target_id: number
  action: string
  created_at: string
  details: { reason?: string }
}
const actionLabels: Record<string, string> = {
  suspend_account: 'Suspension de compte',
  reactivate_account: 'Réactivation de compte',
  update_playlist: 'Modification de playlist',
  delete_playlist: 'Suppression de playlist',
}
export default function AdminOverview({
  totals,
  trend,
  recentUsers,
  recentPlaylists,
  actions,
}: {
  totals: Totals
  trend: Activity[]
  recentUsers: Account[]
  recentPlaylists: PlaylistSummary[]
  actions: Action[]
}) {
  const maximum = Math.max(1, ...trend.flatMap((day) => [day.accounts, day.playlists, day.votes]))
  const percent = totals.votes ? Math.round((totals.smashes / totals.votes) * 100) : 0
  return (
    <AdminShell
      title="Vue d’ensemble"
      description="Les comptes et l’activité de toutes les playlists, publiques et privées."
    >
      <section className="admin-metrics" aria-label="Statistiques globales">
        {[
          {
            label: 'Comptes',
            value: totals.accounts,
            detail: `${totals.accounts - totals.suspended} actifs · ${totals.suspended} suspendus`,
            url: '/admin/users',
          },
          {
            label: 'Inscriptions sur 30 jours',
            value: totals.new_accounts,
            detail: 'Nouveaux comptes enregistrés',
          },
          {
            label: 'Playlists',
            value: totals.playlists,
            detail: `${totals.public_playlists} publiques · ${totals.private_playlists} privées`,
            url: '/admin/playlists',
          },
          { label: 'Éléments', value: totals.items, detail: 'Images présentes dans les playlists' },
          {
            label: 'Votes enregistrés',
            value: totals.votes,
            detail: `${totals.smashes} Smash · ${totals.votes - totals.smashes} Pass · ${percent}% Smash`,
          },
          {
            label: 'Visiteurs ayant voté',
            value: totals.participants,
            detail: 'Identifiants de navigateur distincts',
          },
        ].map((metric) => (
          <article className="admin-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{Number(metric.value).toLocaleString('fr-FR')}</strong>
            <p>{metric.detail}</p>
            {metric.url && <Link href={metric.url}>Consulter →</Link>}
          </article>
        ))}
      </section>
      <section className="admin-panel admin-studio-callout">
        <div>
          <span className="eyebrow">Éditorial</span>
          <h2>Studio éditorial</h2>
          <p>
            {totals.pending_proposals} proposition(s) en attente sur le site. Le studio affiche les
            propositions de votre compte administrateur.
          </p>
        </div>
        <Link className="button button-primary" href="/admin/editorial">
          Ouvrir le studio →
        </Link>
      </section>
      <section className="admin-panel">
        <h2>Activité des 30 derniers jours</h2>
        <p>
          Journées dans le fuseau Europe/Paris. Les visiteurs sont comptés par navigateur ; un
          changement de cookies peut créer un nouvel identifiant.
        </p>
        <div className="admin-chart-legend">
          <span className="accounts">Comptes créés</span>
          <span className="playlists">Playlists créées</span>
          <span className="votes">Votes</span>
        </div>
        <div
          className="admin-chart"
          role="img"
          aria-label="Activité quotidienne. Chiffres détaillés dans le tableau ci-dessous."
        >
          {trend.map((day) => (
            <div
              className="admin-chart-day"
              key={day.day}
              title={`${day.day} : ${day.accounts} comptes, ${day.playlists} playlists, ${day.votes} votes`}
            >
              {(['accounts', 'playlists', 'votes'] as const).map((metric) => (
                <i
                  key={metric}
                  className={metric}
                  style={{
                    height: `${day[metric] ? Math.max(2, (day[metric] / maximum) * 100) : 0}%`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="admin-chart-dates">
          <span>{trend[0]?.day}</span>
          <span>{trend.at(-1)?.day}</span>
        </div>
        <details>
          <summary>Voir les chiffres jour par jour</summary>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Jour</th>
                  <th>Comptes</th>
                  <th>Playlists</th>
                  <th>Votes</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((day) => (
                  <tr key={day.day}>
                    <td>{day.day}</td>
                    <td>{day.accounts}</td>
                    <td>{day.playlists}</td>
                    <td>{day.votes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section className="admin-panel">
        <div className="admin-section-heading">
          <h2>Derniers comptes</h2>
          <Link href="/admin/users">Tous les comptes →</Link>
        </div>
        <AccountsTable users={recentUsers} />
      </section>
      <section className="admin-panel">
        <div className="admin-section-heading">
          <h2>Dernières playlists</h2>
          <Link href="/admin/playlists">Toutes les playlists →</Link>
        </div>
        <PlaylistsTable playlists={recentPlaylists} />
      </section>
      <section className="admin-panel">
        <h2>Journal d’administration</h2>
        {actions.length ? (
          <ul className="admin-audit">
            {actions.map((action) => (
              <li key={action.id}>
                <strong>{actionLabels[action.action] || action.action}</strong>
                <span>
                  {action.target_type === 'user' ? 'Compte' : 'Playlist'} #{action.target_id} ·{' '}
                  {action.actor_full_name || action.actor_name || 'Administrateur'} ·{' '}
                  {adminDate(action.created_at)}
                </span>
                {action.details.reason && <p>{action.details.reason}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucune action enregistrée.</p>
        )}
      </section>
    </AdminShell>
  )
}
