import AdminShell, { AccountsTable, Pages } from '~/components/admin'
import type { Account, Pagination } from '~/admin_types'

export default function AdminUsers({
  users,
  pagination,
  filters,
}: {
  users: Account[]
  pagination: Pagination
  filters: { q: string; status: string }
}) {
  return (
    <AdminShell
      title="Comptes"
      description="Recherchez un compte, consultez ses playlists et gérez son accès."
    >
      <section className="admin-panel">
        <form method="get" action="/admin/users" className="admin-filters">
          <label>
            Rechercher un compte
            <input
              name="q"
              defaultValue={filters.q}
              maxLength={120}
              placeholder="Nom, e-mail ou identifiant Discord"
            />
          </label>
          <label>
            Statut
            <select name="status" defaultValue={filters.status}>
              <option value="all">Tous les comptes</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
            </select>
          </label>
          <button className="button" type="submit">
            Rechercher
          </button>
        </form>
        <AccountsTable users={users} />
        <Pages pagination={pagination} base="/admin/users" params={filters} />
      </section>
    </AdminShell>
  )
}
