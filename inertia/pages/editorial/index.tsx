/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Head, Link, router } from '@inertiajs/react'
import { useState } from 'react'
import type { Proposal, Settings } from '~/editorial_types'

type Job = {
  id: string
  kind: string
  status: string
  attempts: number
  error?: { message: string }
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
}) {
  const [settings, setSettings] = useState(props.settings)
  const [topic, setTopic] = useState('')
  const [category, setCategory] = useState(settings.categories[0] || 'jeux')
  const [subject, setSubject] = useState('')
  const [clientId, setClientId] = useState('')
  const [accessScopes, setAccessScopes] = useState(['editorial:read'])
  const date = (value: string) =>
    new Date(value).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
  return (
    <>
      <Head title="Studio éditorial">
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <section className="dashboard-head">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Studio éditorial.</h1>
          <p>Préparez vos sélections, vérifiez les sources et publiez après examen.</p>
        </div>
      </section>
      <div className="editorial-layout builder-form">
        <section className="editorial-panel">
          <h2>Propositions</h2>
          <button
            className="button"
            onClick={() =>
              router.post('/admin/editorial/proposals', {
                content: JSON.stringify({
                  title: 'Nouvelle sélection',
                  description: '',
                  category,
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
          {props.proposals.length ? (
            props.proposals.map((proposal) => (
              <article className="editorial-row" key={proposal.id}>
                <Link href={`/admin/editorial/proposals/${proposal.id}`}>
                  {proposal.content.title}
                </Link>
                <span>
                  {proposal.status} · version {proposal.revision} · {date(proposal.created_at)}
                </span>
              </article>
            ))
          ) : (
            <p>Aucune proposition.</p>
          )}
        </section>
        <section className="editorial-panel">
          <h2>Préparer depuis l’actualité</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              router.post('/admin/editorial/generate', {
                topic,
                category,
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
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {settings.categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">
              Lancer la préparation
            </button>
            <p>Le sujet doit correspondre à une actualité provenant des sources autorisées.</p>
          </form>
        </section>
        <section className="editorial-panel">
          <h2>Planification</h2>
          <p>
            {props.settings.enabled ? 'Activée' : 'En pause'} · Prochain créneau :{' '}
            {props.nextSlot ? date(props.nextSlot) : 'aucun'}
          </p>
          <p>
            La pause arrête les nouveaux passages planifiés. Les tâches déjà enregistrées continuent
            et les propositions restent consultables.
          </p>
          {props.missing.length > 0 && (
            <p role="status">Avant activation : {props.missing.join(', ')}.</p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              router.post('/admin/editorial/settings', { settings: JSON.stringify(settings) })
            }}
          >
            <label>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
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
                          i === index ? { ...value, weekday: Number(event.target.value) } : value
                        ),
                      })
                    }
                  >
                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(
                      (day, i) => (
                        <option key={day} value={i + 1}>
                          {day}
                        </option>
                      )
                    )}
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
                value={settings.categories.join(', ')}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    categories: event.target.value.split(',').map((value) => value.trim()),
                  })
                }
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
                  sources: [...settings.sources, { title: '', url: '', category }],
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
                  value={settings[field] || ''}
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
            <button className="button button-primary" type="submit">
              Enregistrer les réglages
            </button>
          </form>
        </section>
        <section className="editorial-panel">
          <h2>Exécutions et notifications</h2>
          {props.jobs.map((job) => (
            <article className="editorial-row" key={job.id}>
              <strong>
                {job.kind} · {job.status}
              </strong>
              <span>
                {date(job.created_at)} · {job.attempts} tentative(s)
              </span>
              {job.error && <p>{job.error.message}</p>}
              {job.status === 'failed' && (
                <button onClick={() => router.post(`/admin/editorial/jobs/${job.id}/retry`)}>
                  Relancer cette tâche
                </button>
              )}
            </article>
          ))}
        </section>
        <section className="editorial-panel">
          <h2>Connexions MCP</h2>
          <p>
            Autorisez une identité OAuth existante. Les droits accordés sont limités aux portées de
            son jeton ; aucune connexion MCP ne peut publier.
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
                  onClick={() =>
                    router.post(`/admin/editorial/connections/${connection.id}/revoke`)
                  }
                >
                  Révoquer
                </button>
              )}
            </article>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              router.post('/admin/editorial/connections', {
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
            <button className="button" type="submit">
              Autoriser pour 30 jours
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
