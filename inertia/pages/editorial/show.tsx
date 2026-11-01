/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Head, Link, router } from '@inertiajs/react'
import { useState } from 'react'
import type { Content, Item, Proposal } from '~/editorial_types'
import PublicPlaylist from '../playlists/show'

type Media = {
  id: string
  provenance: { url: string; credit: string; license: string; license_url: string }
}
export default function EditorialShow({
  proposal,
  validation,
  media,
}: {
  proposal: Proposal
  validation: { blockers: string[]; warnings: string[] }
  media: Media[]
}) {
  return (
    <EditorialEditor
      key={`${proposal.id}:${proposal.revision}:${proposal.status}`}
      proposal={proposal}
      validation={validation}
      media={media}
    />
  )
}
function EditorialEditor({
  proposal,
  validation,
  media,
}: {
  proposal: Proposal
  validation: { blockers: string[]; warnings: string[] }
  media: Media[]
}) {
  const [content, setContent] = useState<Content>(proposal.content)
  const [imageItem, setImageItem] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [credit, setCredit] = useState('')
  const [license, setLicense] = useState('CC0')
  const [licenseUrl, setLicenseUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const draft = proposal.status === 'draft'
  const dirty = JSON.stringify(content) !== JSON.stringify(proposal.content)
  const post = (action: string, data = {}) => {
    setBusy(true)
    router.post(
      `/admin/editorial/proposals/${proposal.id}/${action}`,
      { expected_revision: proposal.revision, idempotency_key: crypto.randomUUID(), ...data },
      { onFinish: () => setBusy(false) }
    )
  }
  const updateItem = (index: number, fields: Partial<Item>) =>
    setContent({
      ...content,
      items: content.items.map((item, i) => (i === index ? { ...item, ...fields } : item)),
    })
  return (
    <>
      <Head title={proposal.content.title}>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <section className="dashboard-head">
        <div>
          <Link href="/admin/editorial">← Studio éditorial</Link>
          <h1>{proposal.content.title}</h1>
          <p>
            {proposal.status} · version {proposal.revision}
          </p>
        </div>
      </section>
      <div className="editorial-layout builder-form">
        {proposal.content.items.length > 0 &&
          proposal.content.items.every((item) => item.media_id) && (
            <section className="editorial-panel">
              <h2>Aperçu du jeu</h2>
              <p>Les votes de cet aperçu sont simulés et ne sont pas enregistrés.</p>
              <PublicPlaylist
                key={proposal.revision}
                preview
                canEdit={false}
                playlist={{
                  slug: 'apercu',
                  title: proposal.content.title,
                  description: proposal.content.description,
                  accent: 'lime',
                  isPublic: false,
                }}
                items={proposal.content.items.map((item, index) => ({
                  id: index + 1,
                  title: item.title,
                  description: item.description,
                  imageUrl: `/editorial/media/${item.media_id}`,
                  smashes: 0,
                  passes: 0,
                  imageCredit: media.find((entry) => entry.id === item.media_id)?.provenance,
                }))}
              />
            </section>
          )}
        <section className="editorial-panel">
          <h2>Contrôles et validation</h2>
          {validation.blockers.length ? (
            <ul>
              {validation.blockers.map((blocker, index) => (
                <li key={index}>{blocker}</li>
              ))}
            </ul>
          ) : (
            <p>Les contrôles automatiques sont satisfaits.</p>
          )}
          {validation.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          {dirty && (
            <p role="status">
              Des modifications ne sont pas enregistrées. Enregistrez-les pour actualiser les
              contrôles et l’aperçu.
            </p>
          )}
          <div className="editorial-actions">
            {draft && (
              <>
                <button
                  className="button"
                  disabled={busy || !dirty}
                  onClick={() => post('save', { content: JSON.stringify(content) })}
                >
                  Enregistrer
                </button>
                <button
                  className="button button-primary"
                  disabled={busy || dirty || validation.blockers.length > 0}
                  onClick={() => post('submit')}
                >
                  Soumettre pour examen
                </button>
              </>
            )}
            {proposal.status === 'in_review' && (
              <>
                <button
                  className="button button-primary"
                  disabled={busy || validation.blockers.length > 0}
                  onClick={() => post('publish')}
                >
                  Approuver et publier la version {proposal.revision}
                </button>
                <button className="button" disabled={busy} onClick={() => post('reject')}>
                  Refuser
                </button>
              </>
            )}
            {['in_review', 'rejected'].includes(proposal.status) && (
              <button className="button" disabled={busy} onClick={() => post('reopen')}>
                Rouvrir pour modification
              </button>
            )}
          </div>
        </section>
        <section className="editorial-panel">
          <h2>Contenu</h2>
          <fieldset disabled={!draft || busy}>
            <label>
              Titre
              <input
                maxLength={120}
                value={content.title}
                onChange={(event) => setContent({ ...content, title: event.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                maxLength={600}
                value={content.description}
                onChange={(event) => setContent({ ...content, description: event.target.value })}
              />
            </label>
            <label>
              Catégorie
              <input
                maxLength={60}
                value={content.category}
                onChange={(event) => setContent({ ...content, category: event.target.value })}
              />
            </label>
            {content.items.map((item, index) => (
              <article className="editorial-row" key={item.id || index}>
                <label>
                  Titre de l’élément {index + 1}
                  <input
                    value={item.title}
                    maxLength={120}
                    onChange={(event) => updateItem(index, { title: event.target.value })}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={item.description}
                    maxLength={500}
                    onChange={(event) => updateItem(index, { description: event.target.value })}
                  />
                </label>
                <label>
                  URLs des sources (une par ligne)
                  <textarea
                    value={item.source_urls.join('\n')}
                    onChange={(event) =>
                      updateItem(index, {
                        source_urls: event.target.value.split('\n').filter(Boolean),
                      })
                    }
                  />
                </label>
                <div className="editorial-actions">
                  <button
                    disabled={index === 0}
                    onClick={() => {
                      const items = [...content.items]
                      ;[items[index - 1], items[index]] = [items[index], items[index - 1]]
                      setContent({ ...content, items })
                    }}
                  >
                    Monter
                  </button>
                  <button
                    disabled={index === content.items.length - 1}
                    onClick={() => {
                      const items = [...content.items]
                      ;[items[index + 1], items[index]] = [items[index], items[index + 1]]
                      setContent({ ...content, items })
                    }}
                  >
                    Descendre
                  </button>
                  <button
                    onClick={() =>
                      setContent({ ...content, items: content.items.filter((_, i) => i !== index) })
                    }
                  >
                    Retirer
                  </button>
                </div>
              </article>
            ))}
            <button
              onClick={() =>
                setContent({
                  ...content,
                  items: [
                    ...content.items,
                    {
                      id: crypto.randomUUID(),
                      title: 'Nouvel élément',
                      description: '',
                      source_urls: [],
                    },
                  ],
                })
              }
            >
              Ajouter un élément
            </button>
            <h3>Sources</h3>
            {content.sources.map((source, index) => (
              <div className="editorial-row" key={index}>
                <label>
                  Nom
                  <input
                    value={source.title}
                    onChange={(event) =>
                      setContent({
                        ...content,
                        sources: content.sources.map((value, i) =>
                          i === index ? { ...value, title: event.target.value } : value
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  URL HTTPS
                  <input
                    type="url"
                    value={source.url}
                    onChange={(event) =>
                      setContent({
                        ...content,
                        sources: content.sources.map((value, i) =>
                          i === index ? { ...value, url: event.target.value } : value
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Date de publication (ISO 8601, facultative)
                  <input
                    value={source.published_at || ''}
                    onChange={(event) =>
                      setContent({
                        ...content,
                        sources: content.sources.map((value, i) =>
                          i === index
                            ? { ...value, published_at: event.target.value || undefined }
                            : value
                        ),
                      })
                    }
                  />
                </label>
                <button
                  onClick={() =>
                    setContent({
                      ...content,
                      sources: content.sources.filter((_, i) => i !== index),
                    })
                  }
                >
                  Retirer la source
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setContent({
                  ...content,
                  sources: [
                    ...content.sources,
                    { title: '', url: '', retrieved_at: new Date().toISOString() },
                  ],
                })
              }
            >
              Ajouter une source
            </button>
            <label>
              Points à vérifier (un par ligne ; vider après résolution)
              <textarea
                value={content.checks.join('\n')}
                onChange={(event) =>
                  setContent({ ...content, checks: event.target.value.split('\n').filter(Boolean) })
                }
              />
            </label>
          </fieldset>
        </section>
        {draft && (
          <section className="editorial-panel">
            <h2>Importer ou remplacer une image</h2>
            <p>
              Enregistrez le contenu avant l’import. L’image sera téléchargée et vérifiée en
              arrière-plan.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                post('import', {
                  item_id: imageItem,
                  provenance: JSON.stringify({
                    url: imageUrl,
                    credit,
                    license,
                    license_url: licenseUrl,
                  }),
                })
              }}
            >
              <label>
                Élément
                <select
                  required
                  value={imageItem}
                  onChange={(event) => setImageItem(event.target.value)}
                >
                  <option value="">Choisir</option>
                  {proposal.content.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                URL de l’image
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                />
              </label>
              <label>
                Crédit
                <input
                  required
                  value={credit}
                  onChange={(event) => setCredit(event.target.value)}
                />
              </label>
              <label>
                Licence
                <select value={license} onChange={(event) => setLicense(event.target.value)}>
                  {['CC0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'permission'].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Lien vers la licence ou l’autorisation
                <input
                  type="url"
                  required
                  value={licenseUrl}
                  onChange={(event) => setLicenseUrl(event.target.value)}
                />
              </label>
              <button className="button" disabled={busy || dirty} type="submit">
                Lancer l’import
              </button>
            </form>
          </section>
        )}
        <section className="editorial-panel">
          <h2>Aperçu de la version enregistrée</h2>
          <h3>{proposal.content.title}</h3>
          <p>{proposal.content.description}</p>
          <div className="editorial-preview">
            {proposal.content.items.map((item, index) => {
              const provenance = media.find((image) => image.id === item.media_id)?.provenance
              return (
                <article key={item.id || index}>
                  {item.media_id ? (
                    <img src={`/editorial/media/${item.media_id}`} alt={item.title} />
                  ) : (
                    <p>Image manquante</p>
                  )}
                  <h3>
                    {index + 1}. {item.title}
                  </h3>
                  <p>{item.description}</p>
                  {provenance && (
                    <p>
                      Crédit : {provenance.credit} ·{' '}
                      <a href={provenance.license_url} target="_blank" rel="noreferrer">
                        {provenance.license}
                      </a>
                    </p>
                  )}
                  {item.source_urls.map((url) => (
                    <p key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        Source
                      </a>
                    </p>
                  ))}
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}
