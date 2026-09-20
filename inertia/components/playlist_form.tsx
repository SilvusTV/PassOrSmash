import { useForm } from '@inertiajs/react'
import axios from 'axios'
import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'

type Item = { title: string; description: string; imageUrl: string }
type Initial = {
  title: string
  description: string
  visibility: 'public' | 'private'
  accent: 'lime' | 'violet' | 'coral' | 'sky'
  items: Item[]
}
const blankItem = (): Item => ({ title: '', description: '', imageUrl: '' })

function ImagePreview({ url }: { url: string }) {
  const [failedUrl, setFailedUrl] = useState('')

  if (!url) return <div className="thumb-preview">IMAGE</div>
  if (failedUrl === url) {
    return (
      <div className="thumb-preview broken-image" role="alert">
        Image inaccessible
        <small>Vérifie le lien ou importe le fichier</small>
      </div>
    )
  }

  return (
    <div className="thumb-preview">
      <img src={url} alt="Aperçu" onError={() => setFailedUrl(url)} />
    </div>
  )
}

function ImageSource({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const body = new FormData()
    body.append('image', file)
    try {
      const { data } = await axios.post<{ url: string }>('/uploads/images', body)
      onChange(data.url)
    } catch (uploadError) {
      const message = axios.isAxiosError(uploadError)
        ? uploadError.response?.data?.error
        : undefined
      setError(message || "L'import a échoué. Vérifie le format et réessaie.")
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="image-source">
      <label>
        URL de l’image
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://…"
          required
        />
      </label>
      <span>ou</span>
      <label className={`upload-button ${uploading ? 'uploading' : ''}`}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={upload}
          disabled={uploading}
        />
        {uploading ? 'Import en cours…' : '↑ Importer une image'}
      </label>
      {error && <small className="upload-error">{error}</small>}
    </div>
  )
}

export default function PlaylistForm({
  initial,
  submitUrl,
  method = 'post',
  allowJsonImport = false,
}: {
  initial?: Initial
  submitUrl: string
  method?: 'post' | 'put'
  allowJsonImport?: boolean
}) {
  const form = useForm<Initial>(
    initial || {
      title: '',
      description: '',
      visibility: 'public',
      accent: 'lime',
      items: [blankItem(), blankItem()],
    }
  )
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [jsonValue, setJsonValue] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [importing, setImporting] = useState(false)
  const jsonFile = useRef<HTMLInputElement>(null)

  const normalizeImport = (value: unknown): Initial[] => {
    const entries = Array.isArray(value) ? value : [value]
    if (!entries.length || entries.length > 50)
      throw new Error('Le fichier doit contenir entre 1 et 50 playlists.')
    return entries.map((entry, playlistIndex) => {
      if (!entry || typeof entry !== 'object')
        throw new Error(`Playlist ${playlistIndex + 1} invalide.`)
      const candidate = entry as Partial<Initial>
      if (typeof candidate.title !== 'string' || !candidate.title.trim())
        throw new Error(`La playlist ${playlistIndex + 1} n’a pas de titre.`)
      if (!Array.isArray(candidate.items) || candidate.items.length < 2)
        throw new Error(`« ${candidate.title} » doit contenir au moins 2 images.`)
      return {
        title: candidate.title,
        description: typeof candidate.description === 'string' ? candidate.description : '',
        visibility: candidate.visibility === 'private' ? 'private' : 'public',
        accent: ['lime', 'violet', 'coral', 'sky'].includes(candidate.accent || '')
          ? candidate.accent!
          : 'lime',
        items: candidate.items.map((item, itemIndex) => {
          if (!item || typeof item !== 'object') throw new Error(`Image ${itemIndex + 1} invalide.`)
          const image = item as Partial<Item>
          if (typeof image.title !== 'string' || typeof image.imageUrl !== 'string')
            throw new Error(`Image ${itemIndex + 1} de « ${candidate.title} » incomplète.`)
          return {
            title: image.title,
            description: typeof image.description === 'string' ? image.description : '',
            imageUrl: image.imageUrl,
          }
        }),
      }
    })
  }

  const importJson = async () => {
    setJsonError('')
    try {
      const playlists = normalizeImport(JSON.parse(jsonValue))
      if (playlists.length === 1) {
        form.setData(playlists[0])
        setJsonOpen(false)
        return
      }
      setImporting(true)
      await axios.post('/playlists/import', { playlists })
      window.location.assign('/dashboard')
    } catch (error) {
      setJsonError(
        axios.isAxiosError(error)
          ? error.response?.data?.message || 'Le serveur a refusé cet import.'
          : error instanceof SyntaxError
            ? 'Le JSON n’est pas valide.'
            : error instanceof Error
              ? error.message
              : 'Impossible de lire ce JSON.'
      )
      setImporting(false)
    }
  }

  const updateItem = (index: number, field: keyof Item, value: string) =>
    form.setData(
      'items',
      form.data.items.map((item, current) =>
        current === index ? { ...item, [field]: value } : item
      )
    )

  const moveItem = (from: number, to: number) => {
    if (from === to || to < 0 || to >= form.data.items.length) return
    const reordered = [...form.data.items]
    const [item] = reordered.splice(from, 1)
    reordered.splice(to, 0, item)
    form.setData('items', reordered)
  }

  const dropItem = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault()
    if (draggedIndex !== null) moveItem(draggedIndex, targetIndex)
    setDraggedIndex(null)
    setDragTargetIndex(null)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    form[method](submitUrl)
  }
  return (
    <form className="builder-form" onSubmit={submit}>
      {allowJsonImport && (
        <section className="json-import">
          <div>
            <span className="eyebrow">Outil privé</span>
            <h2>Import JSON</h2>
            <p>Un objet remplit le formulaire. Un tableau publie jusqu’à 50 playlists d’un coup.</p>
          </div>
          <button className="outline-button" type="button" onClick={() => setJsonOpen(!jsonOpen)}>
            {jsonOpen ? 'Fermer' : 'Importer du JSON'}
          </button>
          {jsonOpen && (
            <div className="json-import-editor">
              <textarea
                value={jsonValue}
                onChange={(event) => setJsonValue(event.target.value)}
                rows={12}
                placeholder={
                  '[{\n  "title": "Les meilleurs…",\n  "description": "…",\n  "visibility": "public",\n  "accent": "lime",\n  "items": [{ "title": "…", "imageUrl": "https://…" }]\n}]'
                }
              />
              <input
                ref={jsonFile}
                hidden
                type="file"
                accept="application/json,.json"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (file) setJsonValue(await file.text())
                }}
              />
              <div>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => jsonFile.current?.click()}
                >
                  Choisir un fichier
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={!jsonValue || importing}
                  onClick={importJson}
                >
                  {importing ? 'Import en cours…' : 'Charger le JSON'}
                </button>
              </div>
              {jsonError && (
                <p className="upload-error" role="alert">
                  {jsonError}
                </p>
              )}
            </div>
          )}
        </section>
      )}
      <section className="builder-panel">
        <div className="panel-number">01</div>
        <div className="panel-content">
          <h2>Les bases</h2>
          <p>Un titre clair donne envie de jouer. Décris en une phrase le débat que tu proposes.</p>
          <label>
            Titre de la playlist
            <input
              value={form.data.title}
              onChange={(e) => form.setData('title', e.target.value)}
              placeholder="Ex. Les meilleures pochettes d’albums"
              required
              minLength={3}
            />
          </label>
          <label>
            Description <span>optionnel</span>
            <textarea
              value={form.data.description}
              onChange={(e) => form.setData('description', e.target.value)}
              placeholder="Donne un peu de contexte aux joueurs…"
              rows={3}
            />
          </label>
          <div className="two-cols">
            <fieldset>
              <legend>Visibilité</legend>
              <label className="radio-card">
                <input
                  type="radio"
                  checked={form.data.visibility === 'public'}
                  onChange={() => form.setData('visibility', 'public')}
                />
                <span>
                  <b>Publique</b>
                  <small>Visible dans Explorer</small>
                </span>
              </label>
              <label className="radio-card">
                <input
                  type="radio"
                  checked={form.data.visibility === 'private'}
                  onChange={() => form.setData('visibility', 'private')}
                />
                <span>
                  <b>Privée</b>
                  <small>Accessible avec le lien</small>
                </span>
              </label>
            </fieldset>
            <fieldset>
              <legend>Couleur</legend>
              <div className="accent-picker">
                {(['lime', 'violet', 'coral', 'sky'] as const).map((accent) => (
                  <button
                    aria-label={accent}
                    className={`accent-dot ${accent} ${form.data.accent === accent ? 'selected' : ''}`}
                    type="button"
                    key={accent}
                    onClick={() => form.setData('accent', accent)}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      </section>
      <section className="builder-panel">
        <div className="panel-number">02</div>
        <div className="panel-content">
          <div className="panel-title-row">
            <div>
              <h2>Les images</h2>
              <p>
                Ajoute au moins deux images par lien ou importe-les depuis ton appareil. Elles
                seront présentées dans cet ordre. Fais glisser les cartes pour les réorganiser.
              </p>
            </div>
            <button
              className="outline-button compact"
              type="button"
              onClick={() => form.setData('items', [...form.data.items, blankItem()])}
            >
              ＋ Ajouter
            </button>
          </div>
          <div className="items-editor">
            {form.data.items.map((item, index) => (
              <div
                className={`item-editor ${draggedIndex === index ? 'dragging' : ''} ${dragTargetIndex === index ? 'drag-target' : ''}`}
                key={index}
                onDragEnter={() => setDragTargetIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => dropItem(event, index)}
                onDragEnd={() => {
                  setDraggedIndex(null)
                  setDragTargetIndex(null)
                }}
              >
                <div className="item-order">
                  <button
                    type="button"
                    className="drag-handle"
                    aria-label={`Déplacer l’image ${index + 1}`}
                    title="Glisser pour réorganiser"
                    draggable
                    onDragStart={() => setDraggedIndex(index)}
                  >
                    ⠿
                  </button>
                  <div className="item-index">{String(index + 1).padStart(2, '0')}</div>
                  <div className="order-buttons" aria-label="Modifier la position">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveItem(index, index - 1)}
                      aria-label={`Monter l’image ${index + 1}`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === form.data.items.length - 1}
                      onClick={() => moveItem(index, index + 1)}
                      aria-label={`Descendre l’image ${index + 1}`}
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <ImagePreview url={item.imageUrl} />
                <div className="item-fields">
                  <ImageSource
                    value={item.imageUrl}
                    onChange={(url) => updateItem(index, 'imageUrl', url)}
                  />
                  <label>
                    Titre
                    <input
                      value={item.title}
                      onChange={(e) => updateItem(index, 'title', e.target.value)}
                      placeholder="Son nom"
                      required
                    />
                  </label>
                  <label>
                    Description <span>optionnel</span>
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Une anecdote, une origine…"
                    />
                  </label>
                </div>
                {form.data.items.length > 2 && (
                  <button
                    className="remove-item"
                    type="button"
                    aria-label="Supprimer"
                    onClick={() =>
                      form.setData(
                        'items',
                        form.data.items.filter((_, current) => current !== index)
                      )
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {Object.keys(form.errors).length > 0 && (
        <div className="form-errors">
          Certains champs sont incomplets. Vérifie les informations indiquées.
        </div>
      )}
      <div className="builder-submit">
        <div>
          <b>{form.data.items.length}</b> images prêtes
        </div>
        <button className="button button-primary" disabled={form.processing} type="submit">
          {form.processing
            ? 'Enregistrement…'
            : method === 'put'
              ? 'Enregistrer les changements'
              : 'Publier la playlist'}{' '}
          <span>↗</span>
        </button>
      </div>
    </form>
  )
}
