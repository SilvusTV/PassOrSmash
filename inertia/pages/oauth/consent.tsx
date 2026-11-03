import { Head } from '@inertiajs/react'

const labels: Record<string, string> = {
  'editorial:read': 'Consulter vos playlists, propositions et exécutions',
  'editorial:write': 'Créer, modifier, publier, retirer du site et supprimer vos sélections',
  'editorial:generate':
    'Rechercher des actualités et lancer des préparations dans les limites du budget',
}
export default function Consent({
  uid,
  clientName,
  clientId,
  redirectOrigin,
  requestedScopes,
  accountName,
  csrfToken,
}: {
  uid: string
  clientName: string
  clientId: string
  redirectOrigin: string
  requestedScopes: string[]
  accountName: string
  csrfToken: string
}) {
  return (
    <>
      <Head title="Autoriser la connexion MCP">
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Head>
      <section className="dashboard-head oauth-consent-head">
        <div>
          <span className="eyebrow">Connexion sécurisée</span>
          <h1>Autoriser {clientName} ?</h1>
          <p>Connecté en tant que {accountName} avec Discord.</p>
        </div>
      </section>
      <div className="editorial-layout">
        <section className="editorial-panel">
          <h2>Droits demandés</h2>
          <ul>
            {requestedScopes.map((scope) => (
              <li key={scope}>{labels[scope] || scope}</li>
            ))}
          </ul>
          <p>
            Avec le droit d’écriture, cet assistant peut publier vos sélections et les retirer du
            site. Vous pouvez révoquer son accès depuis l’espace édito.
          </p>
          <p>
            Application déclarée : <strong>{clientName}</strong>
            <br />
            Retour vers : <strong>{redirectOrigin}</strong>
          </p>
          <p>Vérifiez ce domaine de retour avant d’autoriser l’application.</p>
          <details>
            <summary>Identifiant de l’application</summary>
            <p style={{ overflowWrap: 'anywhere' }}>{clientId}</p>
          </details>
          <p>
            L’accès expire au plus tard dans 30 jours. Vous pouvez le révoquer à tout moment dans le
            studio éditorial.
          </p>
          <form method="post" action={`/oauth/interaction/${uid}`} className="editorial-actions">
            <input type="hidden" name="_csrf" value={csrfToken} />
            <button className="button button-primary" type="submit" name="decision" value="allow">
              Autoriser la connexion
            </button>
            <button className="button" type="submit" name="decision" value="deny">
              Refuser
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
