/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Head, Link, router, usePoll } from '@inertiajs/react'
import { useState } from 'react'
import type { Proposal, Settings } from '~/editorial_types'
import { AdminNav } from '~/components/admin'

type Job = {
  id: string
  kind: string
  status: string
  attempts: number
  error?: { message: string }
  result?: { proposal_id?: string }
  created_at: string
}
type Connection = {
  id: string
  subject: string
  client_id: string
  scopes: string[]
  expires_at: string
  revoked: boolean
}
export default function EditorialIndex(props: {
  settings: Settings
  missing: string[]
  nextSlot: string | null
  proposals: Proposal[]
  jobs: Job[]
  connections: Connection[]
  externalOAuth?: boolean
}) {
  const [tab, setTab] = useState('proposals')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [busy, setBusy] = useState(false)
  usePoll(5000, { only: ['jobs', 'proposals', 'connections', 'nextSlot'] })
  const post = (url: string, data = {}) => {
    if (busy) return
    setBusy(true)
    router.post(url, data, { onFinish: () => setBusy(false) })
  }
  const [settings, setSettings] = useState(props.settings)
  const [categories, setCategories] = useState(props.settings.categories.join(', '))
  const [topic, setTopic] = useState('')
  const [category, setCategory] = useState(settings.categories[0] || 'jeux')
  const generationCategory = props.settings.categories.includes(category)
    ? category
    : props.settings.categories[0] || 'jeux'
  const [subject, setSubject] = useState('')
  const [clientId, setClientId] = useState('')
  const [accessScopes, setAccessScopes] = useState(['editorial:read'])
  const statusLabels: Record<string, string> = {
    draft: 'Brouillon',
    in_review: 'À examiner',
    rejected: 'À reprendre',
    published: 'Publiée',
    queued: 'En attente',
    running: 'En cours',
    succeeded: 'Terminée',
    no_topic: 'Aucun sujet',
    failed: 'Échec',
  }
  const generationReady = !props.missing.some((missing) =>
    ['Sources JSON Feed', 'Fournisseur de génération'].includes(missing)
  )
  const filtered = props.proposals.filter(
    (proposal) =>
      (status === 'all' || proposal.status === status) &&
      proposal.content.title.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))
  )
  const date = (value: string) =>
    new Date(value).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
  return (
    <>
      <Head title="Studio éditorial">
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="studio-shell">
        <section className="studio-hero">
          <div>
            <span className="eyebrow">La sélection commence ici</span>
            <h1>
              Studio <span>éditorial.</span>
            </h1>
            <p>Préparez vos sélections, vérifiez les sources et publiez après examen.</p>
          </div>
        </section>
        <div className="editorial-layout">
          <AdminNav />
          <div className="studio-metrics" aria-label="Résumé du studio">
            <div>
              <strong>{props.proposals.filter((p) => p.status === 'draft').length}</strong>
              <span>Brouillons à façonner</span>
            </div>
            <div>
              <strong>{props.proposals.filter((p) => p.status === 'in_review').length}</strong>
              <span>Sélections à examiner</span>
            </div>
            <div>
              <strong>
                {props.jobs.filter((j) => ['queued', 'running'].includes(j.status)).length}
              </strong>
              <span>Tâches en cours</span>
            </div>
            <div>
              <strong>{props.settings.enabled ? 'ON' : 'OFF'}</strong>
              <span>Préparation automatique</span>
            </div>
          </div>
          <nav className="studio-tabs" aria-label="Sections du studio">
            {[
              ['proposals', '01', 'Sélections'],
              ['settings', '02', 'Planification'],
              ['jobs', '03', 'Activité'],
              ['connections', '04', 'Connexions MCP'],
            ].map(([value, number, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                <small aria-hidden="true">{number}</small>
                {label}
              </button>
            ))}
          </nav>
          {tab === 'proposals' && (
            <>
              <section className="editorial-panel">
                <div className="studio-section-heading">
                  <div>
                    <span className="eyebrow">Votre atelier</span>
                    <h2>Les prochaines sélections.</h2>
                  </div>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      post('/admin/editorial/proposals', {
                        content: JSON.stringify({
                          title: 'Nouvelle sélection',
                          description: '',
                          category: generationCategory,
                          items: [],
                          sources: [],
                          checks: [],
                        }),
                        idempotency_key: crypto.randomUUID(),
                      })
                    }
                  >
                    Créer un brouillon
                  </button>
                </div>
                <div className="studio-filters">
                  <label>
                    Rechercher une sélection
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Titre de la sélection…"
                    />
                  </label>
                  <label>
                    Statut
                    <select
                      aria-label="Statut"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="all">Tous les statuts</option>
                      {['draft', 'in_review', 'rejected', 'published'].map((value) => (
                        <option key={value} value={value}>
                          {statusLabels[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {filtered.length ? (
                  filtered.map((proposal) => (
                    <article className="studio-proposal" key={proposal.id}>
                      <Link href={`/admin/editorial/proposals/${proposal.id}`}>
                        {proposal.content.title}
                      </Link>
                      <span>
                        <span className={`studio-badge ${proposal.status}`}>
                          {statusLabels[proposal.status]}
                        </span>{' '}
                        · v{proposal.revision} · {date(proposal.created_at)}
                      </span>
                    </article>
                  ))
                ) : (
                  <div className="studio-empty">
                    <strong>
                      {search || status !== 'all'
                        ? 'Aucun résultat.'
                        : 'Votre prochaine sélection commence ici.'}
                    </strong>
                    <p>Créez un brouillon libre ou préparez une sélection depuis l’actualité.</p>
                  </div>
                )}
              </section>
              <section className="editorial-panel">
                <h2>Préparer depuis l’actualité</h2>
                {!generationReady && (
                  <div className="studio-notice" role="status">
                    <strong>Préparation automatique à configurer</strong>
                    <p>
                      Ajoutez des sources JSON Feed dans la planification et configurez le
                      fournisseur de génération sur le serveur. Vous pouvez déjà créer et publier
                      vos sélections manuellement.
                    </p>
                    <button type="button" onClick={() => setTab('settings')}>
                      Configurer la planification
                    </button>
                  </div>
                )}
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    post('/admin/editorial/generate', {
                      topic,
                      category: generationCategory,
                      item_count: settings.item_count,
                      idempotency_key: crypto.randomUUID(),
                    })
                  }}
                >
                  <label>
                    Sujet recherché
                    <input
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      required
                      maxLength={200}
                    />
                  </label>
                  <label>
                    Catégorie
                    <select
                      aria-label="Catégorie"
                      value={generationCategory}
                      onChange={(event) => setCategory(event.target.value)}
                    >
                      {props.settings.categories.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <button className="button" disabled={busy || !generationReady} type="submit">
                    Lancer la préparation
                  </button>
                  <p>
                    Le sujet doit correspondre à une actualité provenant des sources autorisées.
                  </p>
                </form>
              </section>
            </>
          )}
          {tab === 'settings' && (
            <section className="editorial-panel">
              <h2>À votre rythme.</h2>
              <p>
                {props.settings.enabled ? 'Activée' : 'En pause'} · Prochain créneau :{' '}
                {props.nextSlot ? date(props.nextSlot) : 'aucun'}
              </p>
              <p>
                La pause arrête les nouveaux passages planifiés. Les tâches déjà enregistrées
                continuent et les propositions restent consultables.
              </p>
              {props.missing.length > 0 && (
                <p role="status">Avant activation : {props.missing.join(', ')}.</p>
              )}
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  post('/admin/editorial/settings', {
                    settings: JSON.stringify({
                      ...settings,
                      categories: categories
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean),
                    }),
                  })
                }}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(event) =>
                      setSettings({ ...settings, enabled: event.target.checked })
                    }
                  />{' '}
                  Activer les passages automatiques
                </label>
                <p>Fuseau : Europe/Paris. Horaires proposés à confirmer avant activation.</p>
                {settings.slots.map((slot, index) => (
                  <div className="editorial-row" key={index}>
                    <label>
                      Jour
                      <select
                        value={slot.weekday}
                        onChange={(event) =>
                          setSettings({
                            ...settings,
                            slots: settings.slots.map((value, i) =>
                              i === index
                                ? { ...value, weekday: Number(event.target.value) }
                                : value
                            ),
                          })
                        }
                      >
                        {[
                          'Lundi',
                          'Mardi',
                          'Mercredi',
                          'Jeudi',
                          'Vendredi',
                          'Samedi',
                          'Dimanche',
                        ].map((day, i) => (
                          <option key={day} value={i + 1}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Heure
                      <input
                        type="time"
                        required
                        value={`${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`}
                        onChange={(event) => {
                          const [hour, minute] = event.target.value.split(':').map(Number)
                          setSettings({
                            ...settings,
                            slots: settings.slots.map((value, i) =>
                              i === index ? { ...value, hour, minute } : value
                            ),
                          })
                        }}
                      />
                    </label>
                  </div>
                ))}
                <label>
                  Catégories (séparées par des virgules)
                  <input
                    value={categories}
                    onChange={(event) => setCategories(event.target.value)}
                  />
                </label>
                <h3>Sources autorisées (JSON Feed)</h3>
                {settings.sources.map((source, index) => (
                  <div className="editorial-row" key={index}>
                    {(['title', 'url', 'category'] as const).map((field) => (
                      <label key={field}>
                        {{ title: 'Nom', url: 'URL du flux HTTPS', category: 'Catégorie' }[field]}
                        <input
                          required
                          value={source[field]}
                          onChange={(event) =>
                            setSettings({
                              ...settings,
                              sources: settings.sources.map((value, i) =>
                                i === index ? { ...value, [field]: event.target.value } : value
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          sources: settings.sources.filter((_, i) => i !== index),
                        })
                      }
                    >
                      Retirer
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      sources: [
                        ...settings.sources,
                        { title: '', url: '', category: generationCategory },
                      ],
                    })
                  }
                >
                  Ajouter une source
                </button>
                {(
                  [
                    { field: 'freshness_days', label: 'Fraîcheur des actualités (jours)' },
                    { field: 'catchup_hours', label: 'Rattrapage maximal (heures)' },
                    { field: 'item_count', label: 'Éléments par playlist' },
                    { field: 'daily_job_limit', label: 'Appels de génération par jour' },
                    { field: 'daily_budget_cents', label: 'Budget quotidien (centimes)' },
                    {
                      field: 'generation_call_cost_cents',
                      label: 'Coût maximal réservé par appel (centimes)',
                    },
                    { field: 'automation_user_id', label: 'Identifiant du compte de préparation' },
                  ] as const
                ).map(({ field, label }) => (
                  <label key={field}>
                    {label}
                    <input
                      type="number"
                      min={1}
                      value={settings[field] ?? ''}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          [field]: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                    />
                  </label>
                ))}
                <label>
                  Destinataire de notification
                  <input
                    value={settings.notification_label}
                    onChange={(event) =>
                      setSettings({ ...settings, notification_label: event.target.value })
                    }
                    placeholder="Nom du destinataire configuré sur le serveur"
                  />
                </label>
                <button className="button button-primary" disabled={busy} type="submit">
                  Enregistrer les réglages
                </button>
              </form>
            </section>
          )}
          {tab === 'jobs' && (
            <section className="editorial-panel">
              <span className="eyebrow">Le studio en mouvement</span>
              <h2>Activité & imports.</h2>
              <p>Actualisation automatique toutes les 5 secondes.</p>
              {!props.jobs.length && <p className="studio-empty">Aucune tâche pour le moment.</p>}
              {props.jobs.map((job) => (
                <article className="editorial-row" key={job.id}>
                  <strong>
                    {{
                      image: 'Import d’image',
                      generation: 'Préparation',
                      notification: 'Notification',
                    }[job.kind] || job.kind}{' '}
                    · {statusLabels[job.status] || job.status}
                  </strong>
                  <span>
                    {date(job.created_at)} · {job.attempts} tentative(s)
                  </span>
                  {job.error && <p className="studio-error">{job.error.message}</p>}
                  {job.result?.proposal_id && (
                    <Link
                      className="button"
                      href={`/admin/editorial/proposals/${job.result.proposal_id}`}
                    >
                      Ouvrir la sélection
                    </Link>
                  )}
                  {job.status === 'failed' && (
                    <button onClick={() => post(`/admin/editorial/jobs/${job.id}/retry`)}>
                      Relancer cette tâche
                    </button>
                  )}
                </article>
              ))}
            </section>
          )}
          {tab === 'connections' && (
            <section className="editorial-panel">
              <span className="eyebrow">Vos outils, connectés</span>
              <h2>Connexions MCP.</h2>
              <div className="studio-notice">
                <strong>Créer et modifier des playlists</strong>
                <p>
                  Accordez le droit « editorial:write » lors de la connexion. Si une connexion
                  existante affiche uniquement « editorial:read », reconnectez-la depuis votre
                  application en demandant les droits d’écriture, puis actualisez sa liste d’outils.
                </p>
              </div>
              <p>
                Ajoutez l’URL du MCP à votre application, connectez-vous avec Discord et acceptez
                les droits demandés. L’accès apparaît automatiquement ici et peut être révoqué à
                tout moment. La publication d’une proposition reste soumise à votre validation dans
                le studio. Les outils de playlists peuvent modifier leur visibilité.
              </p>
              {props.connections.map((connection) => (
                <article className="editorial-row" key={connection.id}>
                  <strong>{connection.client_id}</strong>
                  <span>
                    {connection.subject} · {connection.scopes.join(', ')} · expiration{' '}
                    {date(connection.expires_at)}
                  </span>
                  {connection.revoked ? (
                    <span>Révoquée</span>
                  ) : (
                    <button
                      onClick={() => post(`/admin/editorial/connections/${connection.id}/revoke`)}
                    >
                      Révoquer
                    </button>
                  )}
                </article>
              ))}
              {props.externalOAuth && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    post('/admin/editorial/connections', {
                      connection: JSON.stringify({
                        subject,
                        client_id: clientId,
                        scopes: accessScopes,
                        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
                      }),
                    })
                  }}
                >
                  <label>
                    Identité OAuth (sub)
                    <input
                      required
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                    />
                  </label>
                  <label>
                    Identifiant client OAuth
                    <input
                      required
                      value={clientId}
                      onChange={(event) => setClientId(event.target.value)}
                    />
                  </label>
                  {['editorial:read', 'editorial:write', 'editorial:generate'].map((scope) => (
                    <label key={scope}>
                      <input
                        type="checkbox"
                        disabled={scope === 'editorial:read'}
                        checked={accessScopes.includes(scope)}
                        onChange={(event) =>
                          setAccessScopes(
                            event.target.checked
                              ? [...accessScopes, scope]
                              : accessScopes.filter((value) => value !== scope)
                          )
                        }
                      />
                      {scope}
                    </label>
                  ))}
                  <button className="button" disabled={busy} type="submit">
                    Autoriser pour 30 jours
                  </button>
                </form>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  )
}
