/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Head, Link, router, usePoll } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import type { Proposal, Settings } from '~/editorial_types'
import { AdminNav } from '~/components/admin'

type Job = {
  id: string
  kind: string
  status: string
  error?: { message: string }
  result?: { proposal_id?: string }
}
type Connection = { id: string; client_id: string; scopes: string[]; revoked: boolean }
export default function EditorialIndex(props: {
  settings: Settings
  missing: string[]
  nextSlot: string | null
  proposals: Proposal[]
  jobs: Job[]
  connections: Connection[]
  mcpUrl?: string
  externalOAuth?: boolean
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState(props.settings)
  const [categories, setCategories] = useState(props.settings.categories.join(', '))
  const [topic, setTopic] = useState('')
  const [category, setCategory] = useState(props.settings.categories[0] || 'jeux')
  const [subject, setSubject] = useState('')
  const [client, setClient] = useState('')
  const pending = props.jobs.some((job) => ['queued', 'running'].includes(job.status))
  const { start, stop } = usePoll(5000, { only: ['jobs', 'proposals'] }, { autoStart: false })
  useEffect(() => {
    if (pending) start()
    else stop()
    return stop
  }, [pending, start, stop])
  const post = (url: string, data = {}) => {
    if (busy) return
    setBusy(true)
    router.post(url, data, { onFinish: () => setBusy(false) })
  }
  const filtered = props.proposals.filter(
    (proposal) =>
      proposal.content.title.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')) &&
      (filter === 'all' ||
        (filter === 'published'
          ? proposal.status === 'published'
          : proposal.status !== 'published'))
  )
  return (
    <>
      <Head title="Édito">
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="edito-shell">
        <AdminNav />
        <header className="edito-heading">
          <div>
            <h1>Édito</h1>
            <p>Vos sélections, du brouillon à la publication.</p>
          </div>
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() =>
              post('/admin/editorial/proposals', {
                content: JSON.stringify({
                  title: 'Nouvelle sélection',
                  category: 'sélection',
                  items: [],
                }),
                idempotency_key: crypto.randomUUID(),
              })
            }
          >
            + Nouvelle sélection
          </button>
        </header>
        <section className="edito-list editorial-panel" aria-label="Sélections">
          <div className="edito-list-filters">
            <label>
              Rechercher
              <input
                type="search"
                placeholder="Rechercher une sélection…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label>
              Afficher
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">Toutes</option>
                <option value="draft">Brouillons</option>
                <option value="published">En ligne</option>
              </select>
            </label>
          </div>
          {filtered.map((proposal) => (
            <Link
              className="edito-selection"
              key={proposal.id}
              href={`/admin/editorial/proposals/${proposal.id}`}
            >
              <div>
                <strong>{proposal.content.title}</strong>
                <span>
                  {proposal.content.items.length} éléments · {proposal.content.category}
                </span>
              </div>
              <span
                className={`studio-badge ${proposal.status === 'published' ? 'published' : 'draft'}`}
              >
                {proposal.status === 'published' ? 'En ligne' : 'Brouillon'}
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
          {!filtered.length && (
            <p className="edito-empty">
              {search || filter !== 'all'
                ? 'Aucune sélection trouvée.'
                : 'Créez votre première sélection ou demandez-la à votre assistant connecté.'}
            </p>
          )}
        </section>
        <details className="edito-details editorial-panel">
          <summary>Préparation automatique</summary>
          <p>Une option pour préparer des brouillons depuis l’actualité.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              post('/admin/editorial/generate', {
                topic,
                category,
                item_count: settings.item_count,
                idempotency_key: crypto.randomUUID(),
              })
            }}
          >
            <div className="edito-basics">
              <label>
                Sujet
                <input
                  required
                  maxLength={200}
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                />
              </label>
              <label>
                Catégorie
                <input
                  required
                  maxLength={60}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                />
              </label>
            </div>
            <button
              className="button"
              disabled={
                busy ||
                props.missing.some((value) =>
                  ['Sources JSON Feed', 'Fournisseur de génération'].includes(value)
                )
              }
            >
              Préparer un brouillon
            </button>
          </form>
          <details className="edito-subdetails">
            <summary>Réglages de l’automatisation</summary>
            {props.missing.length > 0 && (
              <p>À configurer pour l’automatisation : {props.missing.join(', ')}.</p>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault()
                post('/admin/editorial/settings', {
                  settings: JSON.stringify({
                    ...settings,
                    categories: categories
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  }),
                })
              }}
            >
              <label className="edito-checkbox">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
                />{' '}
                Préparer automatiquement
              </label>
              {settings.slots.map((slot, index) => (
                <div className="edito-basics" key={index}>
                  <label>
                    Jour {index + 1}
                    <select
                      value={slot.weekday}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          slots: settings.slots.map((value, i) =>
                            i === index ? { ...value, weekday: Number(event.target.value) } : value
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
                    Heure {index + 1}
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
              <p>
                Heure de Paris.
                {props.nextSlot &&
                  ` Prochain passage : ${new Date(props.nextSlot).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}.`}
              </p>
              <label>
                Nombre d’éléments
                <input
                  type="number"
                  min={2}
                  max={30}
                  required
                  value={settings.item_count}
                  onChange={(event) =>
                    setSettings({ ...settings, item_count: Number(event.target.value) })
                  }
                />
              </label>
              <h3>Flux d’actualité</h3>
              {settings.sources.map((source, index) => (
                <div className="edito-feed" key={index}>
                  {(['title', 'url', 'category'] as const).map((field) => (
                    <label key={field}>
                      {
                        {
                          title: 'Nom du flux',
                          url: 'URL du flux JSON Feed',
                          category: 'Catégorie du flux',
                        }[field]
                      }
                      <input
                        required
                        type={field === 'url' ? 'url' : 'text'}
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
                    Retirer ce flux
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    sources: [...settings.sources, { title: '', url: '', category }],
                  })
                }
              >
                Ajouter un flux
              </button>
              <details className="edito-subdetails">
                <summary>Budget et options</summary>
                <label>
                  Catégories (séparées par des virgules)
                  <input
                    value={categories}
                    onChange={(event) => setCategories(event.target.value)}
                  />
                </label>
                {(
                  [
                    { field: 'freshness_days', label: 'Âge maximal des actualités (jours)' },
                    { field: 'catchup_hours', label: 'Rattrapage (heures)' },
                    { field: 'daily_job_limit', label: 'Préparations par jour' },
                    { field: 'daily_budget_cents', label: 'Budget quotidien (centimes)' },
                    {
                      field: 'generation_call_cost_cents',
                      label: 'Coût maximal par préparation (centimes)',
                    },
                  ] as const
                ).map(({ field, label }) => (
                  <label key={field}>
                    {label}
                    <input
                      type="number"
                      min={1}
                      required
                      value={settings[field]}
                      onChange={(event) =>
                        setSettings({ ...settings, [field]: Number(event.target.value) })
                      }
                    />
                  </label>
                ))}
                <label>
                  Notification (facultative)
                  <input
                    value={settings.notification_label}
                    onChange={(event) =>
                      setSettings({ ...settings, notification_label: event.target.value })
                    }
                  />
                </label>
              </details>
              <button className="button button-primary" disabled={busy}>
                Enregistrer les réglages
              </button>
            </form>
          </details>
        </details>
        <details className="edito-details editorial-panel">
          <summary>Assistant connecté · MCP</summary>
          <p>
            Connectez votre assistant à <code>{props.mcpUrl || '/mcp'}</code> avec Discord, en
            autorisant l’écriture. Il peut créer, modifier, gérer les images, publier, retirer du
            site et supprimer vos sélections.
          </p>
          {props.connections.length === 0 && <p>Aucun assistant connecté.</p>}
          {props.connections.map((connection) => (
            <div className="edito-connection" key={connection.id}>
              <div>
                <strong>{connection.client_id}</strong>
                <p>
                  {connection.revoked
                    ? 'Accès révoqué'
                    : connection.scopes.includes('editorial:write')
                      ? 'Lecture et écriture'
                      : 'Lecture seule — reconnectez-vous pour autoriser les modifications'}
                </p>
              </div>
              {!connection.revoked && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => post(`/admin/editorial/connections/${connection.id}/revoke`)}
                >
                  Révoquer
                </button>
              )}
            </div>
          ))}
          {props.externalOAuth && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                post('/admin/editorial/connections', {
                  connection: JSON.stringify({
                    subject,
                    client_id: client,
                    scopes: ['editorial:read', 'editorial:write', 'editorial:generate'],
                    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
                  }),
                })
              }}
            >
              <label>
                Identité OAuth
                <input
                  required
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </label>
              <label>
                Client OAuth
                <input
                  required
                  value={client}
                  onChange={(event) => setClient(event.target.value)}
                />
              </label>
              <button className="button" disabled={busy}>
                Autoriser pour 30 jours
              </button>
            </form>
          )}
        </details>
        {props.jobs.length > 0 && (
          <details className="edito-details editorial-panel">
            <summary>Activité{pending ? ' · en cours' : ''}</summary>
            {props.jobs.slice(0, 20).map((job) => (
              <div className="edito-job" key={job.id}>
                <div>
                  <strong>
                    {{
                      generation: 'Préparation',
                      image: 'Import d’image',
                      notification: 'Notification',
                    }[job.kind] || job.kind}
                  </strong>
                  <p>
                    {{
                      queued: 'En attente',
                      running: 'En cours',
                      succeeded: 'Terminée',
                      no_topic: 'Aucun sujet trouvé',
                      failed: 'Échec',
                      cancelled: 'Annulée',
                    }[job.status] || job.status}
                    {job.error && ` · ${job.error.message}`}
                  </p>
                </div>
                {job.result?.proposal_id && (
                  <Link href={`/admin/editorial/proposals/${job.result.proposal_id}`}>Ouvrir</Link>
                )}
                {job.status === 'failed' && (
                  <button
                    disabled={busy}
                    onClick={() => post(`/admin/editorial/jobs/${job.id}/retry`)}
                  >
                    Réessayer
                  </button>
                )}
              </div>
            ))}
          </details>
        )}
      </div>
    </>
  )
}
