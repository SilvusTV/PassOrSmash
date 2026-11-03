/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Head, Link, router, usePoll } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import type { Content, Item, Proposal } from '~/editorial_types'
import PublicPlaylist from '../playlists/show'
import { AdminNav } from '~/components/admin'

type ImageJob = {
  id: string
  status: string
  attempts: number
  error?: { message: string }
  input: { item_id: string }
}
type Media = {
  id: string
  path: string
  provenance: { url?: string; credit: string; license?: string; license_url?: string }
}
export default function EditorialShow({
  proposal,
  validation,
  media,
  jobs,
}: {
  proposal: Proposal
  validation: { blockers: string[]; warnings: string[] }
  media: Media[]
  jobs: ImageJob[]
}) {
  const [tab, setTab] = useState('content')
  return (
    <EditorialEditor
      key={proposal.id}
      proposal={proposal}
      validation={validation}
      media={media}
      jobs={jobs}
      tab={tab}
      setTab={setTab}
    />
  )
}
function contentKey(content: Content) {
  return JSON.stringify([
    content.title,
    content.description,
    content.category,
    content.checks,
    content.items.map((item) => [
      item.id,
      item.title,
      item.description,
      item.media_id,
      item.source_urls,
    ]),
    content.sources.map((source) => [
      source.title,
      source.url,
      source.published_at,
      source.retrieved_at,
    ]),
  ])
}
function cleanEditorialContent(content: Content): Content {
  return {
    ...content,
    checks: content.checks.map((line) => line.trim()).filter(Boolean),
    items: content.items.map((item) => ({
      ...item,
      source_urls: item.source_urls.map((url) => url.trim()).filter(Boolean),
    })),
  }
}
function EditorialEditor({
  proposal,
  validation,
  media,
  jobs,
  tab,
  setTab,
}: {
  proposal: Proposal
  validation: { blockers: string[]; warnings: string[] }
  media: Media[]
  jobs: ImageJob[]
  tab: string
  setTab: (value: string) => void
}) {
  const [content, setContent] = useState<Content>(proposal.content)
  const [base, setBase] = useState(proposal)
  if (base.revision !== proposal.revision || base.status !== proposal.status) {
    setBase(proposal)
    if (
      contentKey(content) === contentKey(base.content) ||
      contentKey(cleanEditorialContent(content)) === contentKey(proposal.content)
    )
      setContent(proposal.content)
    else if (proposal.status === 'draft') {
      // Keep unsaved text after a conflict, while retaining images applied by the worker.
      setContent({
        ...content,
        items: content.items.map((item) => ({
          ...item,
          media_id: proposal.content.items.find((current) => current.id === item.id)?.media_id,
        })),
      })
    } else setContent(proposal.content)
  }
  const [imageItem, setImageItem] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [credit, setCredit] = useState('')
  const [imageMode, setImageMode] = useState<'link' | 'upload'>('link')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const draft = proposal.status === 'draft'
  const dirty = contentKey(content) !== contentKey(proposal.content)
  const pending = jobs.some((job) => ['queued', 'running'].includes(job.status))
  const { start, stop } = usePoll(3000, {}, { autoStart: false })
  useEffect(() => {
    if (pending && !dirty && !busy) start()
    else stop()
    return stop
  }, [pending, dirty, busy, start, stop])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    const off = router.on('before', (event) => {
      if (
        event.detail.visit.method === 'get' &&
        event.detail.visit.url.pathname !== window.location.pathname &&
        !window.confirm('Quitter cette sélection sans enregistrer vos modifications ?')
      )
        event.preventDefault()
    })
    return () => {
      window.removeEventListener('beforeunload', warn)
      off()
    }
  }, [dirty])
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    in_review: 'À examiner',
    rejected: 'À reprendre',
    published: 'Publiée',
  }
  const post = (action: string, data = {}) => {
    if (busy) return
    setBusy(true)
    router.post(
      `/admin/editorial/proposals/${proposal.id}/${action}`,
      { expected_revision: proposal.revision, idempotency_key: crypto.randomUUID(), ...data },
      { onFinish: () => setBusy(false) }
    )
  }
  const imageSrc = (mediaId: string) => {
    const image = media.find((entry) => entry.id === mediaId)
    return image && !image.path ? image.provenance.url : `/editorial/media/${mediaId}`
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
      <div className="studio-shell">
        <section className="studio-hero studio-hero-compact">
          <div>
            <Link href="/admin/editorial">← Studio éditorial</Link>
            <h1>{proposal.content.title}</h1>
            <p>
              <span className={`studio-badge ${proposal.status}`}>{labels[proposal.status]}</span> ·
              version {proposal.revision}
            </p>
          </div>
        </section>
        <div className="editorial-layout">
          <AdminNav />
          <nav className="studio-tabs" aria-label="Sections de la sélection">
            {[
              ['content', '01', 'Contenu'],
              ['images', '02', 'Images & crédits'],
              ['preview', '03', 'Aperçu du jeu'],
            ].map(([value, number, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                <small aria-hidden="true">{number}</small>
                {label}
              </button>
            ))}
          </nav>
          {tab === 'preview' && !proposal.content.items.every((item) => item.media_id) && (
            <div className="studio-notice">
              Ajoutez une image à chaque élément pour essayer le jeu. Les images déjà enregistrées
              restent visibles ci-dessous.
            </div>
          )}
          {tab === 'preview' &&
            proposal.content.items.length > 0 &&
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
                    imageUrl: imageSrc(item.media_id!)!,
                    smashes: 0,
                    passes: 0,
                    imageCredit: media.find((entry) => entry.id === item.media_id)?.provenance,
                  }))}
                />
              </section>
            )}
          <section className="editorial-panel">
            <span className="eyebrow">Avant de publier</span>
            <h2>Prête à être partagée ?</h2>
            {validation.blockers.length ? (
              <details className="studio-checks">
                <summary>{validation.blockers.length} point(s) à corriger</summary>
                <ul>
                  {validation.blockers.map((blocker, index) => (
                    <li key={index}>{blocker}</li>
                  ))}
                </ul>
              </details>
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
                    type="submit"
                    form="editorial-content"
                    onClick={() => setTab('content')}
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
          <section className="editorial-panel" hidden={tab !== 'content'}>
            <span className="eyebrow">La matière première</span>
            <h2>Composez votre sélection.</h2>
            <form
              id="editorial-content"
              onSubmit={(event) => {
                event.preventDefault()
                post('save', { content: JSON.stringify(cleanEditorialContent(content)) })
              }}
            >
              <fieldset disabled={!draft || busy}>
                <label>
                  Titre
                  <input
                    maxLength={120}
                    minLength={3}
                    required
                    value={content.title}
                    onChange={(event) => setContent({ ...content, title: event.target.value })}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    aria-label="Description de la sélection"
                    maxLength={600}
                    value={content.description}
                    onChange={(event) =>
                      setContent({ ...content, description: event.target.value })
                    }
                  />
                </label>
                <label>
                  Catégorie
                  <input
                    maxLength={60}
                    required
                    value={content.category}
                    onChange={(event) => setContent({ ...content, category: event.target.value })}
                  />
                </label>
                {content.items.map((item, index) => (
                  <article className="editorial-row studio-item" key={item.id || index}>
                    <div className="studio-item-heading">
                      <span className="studio-number">{String(index + 1).padStart(2, '0')}</span>
                      {item.media_id ? (
                        <img
                          className="studio-thumbnail"
                          src={imageSrc(item.media_id)}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span className="studio-image-placeholder">Image à ajouter</span>
                      )}
                    </div>
                    <label>
                      Titre de l’élément {index + 1}
                      <input
                        value={item.title}
                        required
                        maxLength={120}
                        onChange={(event) => updateItem(index, { title: event.target.value })}
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        aria-label={`Description de l’élément ${index + 1}`}
                        value={item.description}
                        maxLength={500}
                        onChange={(event) => updateItem(index, { description: event.target.value })}
                      />
                    </label>
                    <label>
                      URLs des sources (une par ligne)
                      <textarea
                        aria-label="URLs des sources (une par ligne)"
                        value={item.source_urls.join('\n')}
                        onChange={(event) =>
                          updateItem(index, {
                            source_urls: event.target.value.split('\n'),
                          })
                        }
                      />
                    </label>
                    <div className="editorial-actions">
                      <button
                        type="button"
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
                        type="button"
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
                        type="button"
                        onClick={() =>
                          setContent({
                            ...content,
                            items: content.items.filter((_, i) => i !== index),
                          })
                        }
                      >
                        Retirer
                      </button>
                    </div>
                  </article>
                ))}
                <button
                  type="button"
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
                        required
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
                        required
                        pattern="https://.*"
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
                      type="button"
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
                  type="button"
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
                    aria-label="Points à vérifier (un par ligne ; vider après résolution)"
                    value={content.checks.join('\n')}
                    onChange={(event) =>
                      setContent({
                        ...content,
                        checks: event.target.value.split('\n'),
                      })
                    }
                  />
                </label>
              </fieldset>
              {draft && (
                <button className="button button-primary" type="submit" disabled={busy || !dirty}>
                  Enregistrer le contenu
                </button>
              )}
            </form>
          </section>
          {tab === 'images' && draft && (
            <section className="editorial-panel">
              <span className="eyebrow">Donnez-leur une image</span>
              <h2>Images & crédits.</h2>
              {dirty && <p role="status">Enregistrez le contenu avant d’ajouter une image.</p>}
              <form
                className="studio-image-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (busy || dirty) return
                  setBusy(true)
                  router.post(
                    `/admin/editorial/proposals/${proposal.id}/image`,
                    {
                      expected_revision: proposal.revision,
                      item_id: imageItem,
                      credit,
                      ...(imageMode === 'upload' ? { image: imageFile } : { url: imageUrl }),
                    },
                    { onFinish: () => setBusy(false) }
                  )
                }}
              >
                <label>
                  Élément
                  <select
                    aria-label="Élément"
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
                {imageMode === 'link' ? (
                  <label>
                    URL de l’image
                    <input
                      type="url"
                      required
                      pattern="https://.*"
                      placeholder="https://…"
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                    />
                  </label>
                ) : (
                  <label>
                    Image depuis le PC
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      required
                      onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                    />
                  </label>
                )}
                <label>
                  Crédit (facultatif)
                  <input
                    maxLength={500}
                    value={credit}
                    onChange={(event) => setCredit(event.target.value)}
                  />
                </label>
                <div className="editorial-actions studio-image-actions">
                  <button
                    className="button"
                    type="button"
                    onClick={() => setImageMode(imageMode === 'link' ? 'upload' : 'link')}
                  >
                    {imageMode === 'link' ? 'Importer depuis le PC' : 'Utiliser un lien'}
                  </button>
                  <button
                    className="button button-primary"
                    disabled={busy || dirty || !imageItem}
                    type="submit"
                  >
                    {busy ? 'Enregistrement…' : 'Enregistrer l’image'}
                  </button>
                </div>
              </form>
            </section>
          )}
          {tab === 'images' &&
            jobs.some((job) => ['queued', 'running', 'failed'].includes(job.status)) && (
              <section className="editorial-panel">
                <h2>Suivi des imports.</h2>
                {dirty && (
                  <p role="status">Enregistrez vos modifications pour actualiser les imports.</p>
                )}
                {!jobs.length && <p>Aucun import lancé pour cette sélection.</p>}
                {jobs.map((job) => (
                  <article className="editorial-row" key={job.id}>
                    <strong>
                      {proposal.content.items.find((item) => item.id === job.input.item_id)
                        ?.title || 'Élément retiré'}
                    </strong>
                    <span role="status">
                      {{
                        queued: 'En attente de traitement',
                        running: 'Téléchargement et vérification…',
                        succeeded: 'Image importée',
                        failed: 'Import échoué',
                      }[job.status] || job.status}{' '}
                      · {job.attempts} tentative(s)
                    </span>
                    {job.error && <p className="studio-error">{job.error.message}</p>}
                    {job.status === 'failed' && (
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => router.post(`/admin/editorial/jobs/${job.id}/retry`)}
                      >
                        Réessayer l’import
                      </button>
                    )}
                  </article>
                ))}
              </section>
            )}
          {tab !== 'content' && (
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
                        <img src={imageSrc(item.media_id)} alt={item.title} loading="lazy" />
                      ) : (
                        <p>Image manquante</p>
                      )}
                      <h3>
                        {index + 1}. {item.title}
                      </h3>
                      <p>{item.description}</p>
                      {provenance?.credit && <p>Crédit : {provenance.credit}</p>}
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
          )}
        </div>
      </div>
    </>
  )
}
