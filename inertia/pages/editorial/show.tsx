/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Head, Link, router } from '@inertiajs/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Content, Item, Proposal } from '~/editorial_types'
import { AdminNav } from '~/components/admin'
import PublicPlaylist from '../playlists/show'

type Media = { id: string; path: string; provenance: { url?: string; credit?: string } }
function initialContent(proposal: Proposal, media: Media[]): Content {
  return {
    ...proposal.content,
    items: proposal.content.items.map((item) => {
      const image = media.find((entry) => entry.id === item.media_id)
      return { ...item, image_credit: item.image_credit ?? image?.provenance.credit ?? '' }
    }),
  }
}
export default function EditorialShow(props: { proposal: Proposal; media: Media[] }) {
  return <Editor key={props.proposal.id} {...props} />
}
function Editor({ proposal, media }: { proposal: Proposal; media: Media[] }) {
  const [content, setContent] = useState(() => initialContent(proposal, media))
  const [files, setFiles] = useState<Record<string, File>>({})
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const published = proposal.status === 'published'
  const dirty =
    JSON.stringify(content) !== JSON.stringify(initialContent(proposal, media)) ||
    Object.keys(files).length > 0
  const previewUrls = useRef(new Set<string>())
  useEffect(() => {
    const urls = previewUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    const off = router.on('before', (event) => {
      if (
        event.detail.visit.method === 'get' &&
        !window.confirm('Quitter sans enregistrer les modifications ?')
      )
        event.preventDefault()
    })
    return () => {
      window.removeEventListener('beforeunload', warn)
      off()
    }
  }, [dirty])
  const update = (index: number, fields: Partial<Item>) =>
    setContent((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...fields } : item)),
    }))
  const imageSrc = (item: Item) => {
    if (previews[item.id!]) return previews[item.id!]
    if (item.image_url) return item.image_url
    const image = media.find((entry) => entry.id === item.media_id)
    return image ? (image.path ? `/editorial/media/${image.id}` : image.provenance.url) : undefined
  }
  const clearFile = (id: string) => {
    const url = previews[id]
    if (url) {
      URL.revokeObjectURL(url)
      previewUrls.current.delete(url)
    }
    setFiles((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)))
    setPreviews((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => key !== id))
    )
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const publish =
      published || (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'publish'
    if (publish && (content.items.length < 2 || content.items.some((item) => !imageSrc(item)))) {
      setError('Ajoutez au moins deux éléments, avec une image pour chacun.')
      return
    }
    setError('')
    setBusy(true)
    router.post(
      `/admin/editorial/proposals/${proposal.id}/${publish ? 'save_publish' : 'save'}`,
      {
        expected_revision: proposal.revision,
        content: JSON.stringify(content),
        ...Object.fromEntries(Object.entries(files).map(([id, file]) => [`image_${id}`, file])),
      },
      {
        onSuccess: (page) => {
          if (page.flash?.error) return
          const saved = page.props as unknown as { proposal: Proposal; media: Media[] }
          setContent(initialContent(saved.proposal, saved.media))
          setFiles({})
          setPreviews({})
          previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
          previewUrls.current.clear()
        },
        onFinish: () => setBusy(false),
      }
    )
  }
  const action = (name: string) => {
    if (busy) return
    if (name === 'delete' && !window.confirm('Supprimer cette sélection ?')) return
    setBusy(true)
    router.post(
      `/admin/editorial/proposals/${proposal.id}/${name}`,
      { expected_revision: proposal.revision },
      { onFinish: () => setBusy(false) }
    )
  }
  const move = (index: number, direction: number) => {
    const items = [...content.items]
    ;[items[index], items[index + direction]] = [items[index + direction], items[index]]
    setContent({ ...content, items })
  }
  return (
    <>
      <Head title={proposal.content.title}>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="edito-shell">
        <AdminNav />
        <Link href="/admin/editorial" className="edito-back">
          ← Toutes les sélections
        </Link>
        <header className="edito-heading">
          <div>
            <span className={`studio-badge ${published ? 'published' : 'draft'}`}>
              {published ? 'En ligne' : 'Brouillon'}
            </span>
            <h1>{proposal.content.title}</h1>
          </div>
          <div className="editorial-actions">
            <button type="button" className="button" onClick={() => setPreview(!preview)}>
              {preview ? 'Fermer l’aperçu' : 'Aperçu'}
            </button>
            {published && (
              <>
                {proposal.public_url && (
                  <a className="button" href={proposal.public_url} target="_blank" rel="noreferrer">
                    Voir sur le site ↗
                  </a>
                )}
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => action('unpublish')}
                >
                  Retirer du site
                </button>
              </>
            )}
            {!published && (
              <button type="submit" form="edito-form" className="button" disabled={busy || !dirty}>
                Enregistrer
              </button>
            )}
            <button
              type="submit"
              form="edito-form"
              value="publish"
              className="button button-primary"
              disabled={busy || (published && !dirty)}
            >
              {busy ? 'Enregistrement…' : published ? 'Mettre à jour' : 'Publier'}
            </button>
          </div>
        </header>
        {error && (
          <p role="alert" className="studio-error">
            {error}
          </p>
        )}
        {preview && (
          <section className="edito-preview editorial-panel">
            <h2>Aperçu</h2>
            {content.items.length >= 2 && content.items.every(imageSrc) ? (
              <PublicPlaylist
                key={JSON.stringify(content)}
                preview
                canEdit={false}
                playlist={{
                  slug: 'apercu',
                  title: content.title,
                  description: content.description,
                  accent: 'lime',
                  isPublic: false,
                }}
                items={content.items.map((item, index) => ({
                  id: index + 1,
                  title: item.title,
                  description: item.description,
                  imageUrl: imageSrc(item)!,
                  smashes: 0,
                  passes: 0,
                  imageCredit: { credit: item.image_credit || '' },
                }))}
              />
            ) : (
              <p>Ajoutez deux éléments et leurs images pour essayer le jeu.</p>
            )}
          </section>
        )}
        <form id="edito-form" onSubmit={save} className="edito-form editorial-panel">
          <fieldset disabled={busy}>
            <div className="edito-basics">
              <label>
                Titre
                <input
                  value={content.title}
                  required
                  minLength={3}
                  maxLength={120}
                  onChange={(event) => setContent({ ...content, title: event.target.value })}
                />
              </label>
              <label>
                Catégorie
                <input
                  value={content.category}
                  required
                  maxLength={60}
                  onChange={(event) => setContent({ ...content, category: event.target.value })}
                />
              </label>
            </div>
            <label>
              Description (facultative)
              <textarea
                aria-label="Description (facultative)"
                rows={2}
                maxLength={600}
                value={content.description}
                onChange={(event) => setContent({ ...content, description: event.target.value })}
              />
            </label>
            <div className="edito-section-title">
              <h2>
                Éléments <small>{content.items.length}</small>
              </h2>
            </div>
            {content.items.map((item, index) => (
              <article className="edito-item" key={item.id}>
                <div className="edito-item-picture">
                  {imageSrc(item) ? (
                    <img src={imageSrc(item)} alt={item.title} />
                  ) : (
                    <span>Ajouter une image</span>
                  )}
                </div>
                <div className="edito-item-fields">
                  <div className="edito-item-heading">
                    <strong>{String(index + 1).padStart(2, '0')}</strong>
                    <div className="editorial-actions">
                      <button
                        type="button"
                        aria-label={`Monter l’élément ${index + 1}`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Descendre l’élément ${index + 1}`}
                        disabled={index === content.items.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label={`Retirer l’élément ${index + 1}`}
                        onClick={() => {
                          clearFile(item.id!)
                          setContent({
                            ...content,
                            items: content.items.filter((_, i) => i !== index),
                          })
                        }}
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                  <div className="edito-text-fields">
                    <label>
                      Titre de l’élément {index + 1}
                      <input
                        required
                        maxLength={120}
                        value={item.title}
                        onChange={(event) => update(index, { title: event.target.value })}
                      />
                    </label>
                    <label>
                      Description de l’élément {index + 1}
                      <input
                        maxLength={500}
                        value={item.description}
                        onChange={(event) => update(index, { description: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className="edito-image-fields">
                    <label>
                      Lien de l’image {index + 1}
                      <input
                        type="url"
                        maxLength={2048}
                        placeholder="https://…"
                        value={item.image_url || ''}
                        onChange={(event) => {
                          clearFile(item.id!)
                          update(index, {
                            image_url: event.target.value || undefined,
                            media_id: undefined,
                          })
                        }}
                      />
                    </label>
                    <label>
                      Crédit {index + 1} (facultatif)
                      <input
                        maxLength={500}
                        value={item.image_credit || ''}
                        onChange={(event) => update(index, { image_credit: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className="edito-file-row">
                    <label className="edito-upload">
                      Importer depuis le PC
                      <input
                        type="file"
                        aria-label={`Importer une image pour l’élément ${index + 1}`}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (!file) return
                          if (file.size > 8 * 1024 * 1024) {
                            setError('Image trop volumineuse (8 Mo maximum).')
                            event.target.value = ''
                            return
                          }
                          setError('')
                          clearFile(item.id!)
                          const url = URL.createObjectURL(file)
                          previewUrls.current.add(url)
                          setPreviews((current) => ({ ...current, [item.id!]: url }))
                          setFiles((current) => ({ ...current, [item.id!]: file }))
                          update(index, { image_url: undefined, media_id: undefined })
                          event.target.value = ''
                        }}
                      />
                    </label>
                    {files[item.id!] && <span>{files[item.id!].name}</span>}
                    {imageSrc(item) && (
                      <button
                        type="button"
                        onClick={() => {
                          clearFile(item.id!)
                          update(index, { image_url: undefined, media_id: undefined })
                        }}
                      >
                        Retirer l’image
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!content.items.length && <p>Ajoutez les éléments que les joueurs vont comparer.</p>}
            <button
              type="button"
              className="button edito-add"
              disabled={content.items.length >= 100}
              onClick={() =>
                setContent({
                  ...content,
                  items: [
                    ...content.items,
                    {
                      id: crypto.randomUUID(),
                      title: '',
                      description: '',
                      source_urls: [],
                      image_credit: '',
                    },
                  ],
                })
              }
            >
              + Ajouter un élément
            </button>
          </fieldset>
        </form>
        <div className="edito-footer">
          <span>{dirty ? 'Modifications non enregistrées' : 'Tout est enregistré'}</span>
          <button type="button" disabled={busy} onClick={() => action('delete')}>
            Supprimer la sélection
          </button>
        </div>
      </div>
    </>
  )
}
