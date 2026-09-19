import { useForm } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

type Item = { title: string; description: string; imageUrl: string }
type Initial = {
  title: string
  description: string
  visibility: 'public' | 'private'
  accent: 'lime' | 'violet' | 'coral' | 'sky'
  items: Item[]
}
const blankItem = (): Item => ({ title: '', description: '', imageUrl: '' })

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
}: {
  initial?: Initial
  submitUrl: string
  method?: 'post' | 'put'
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
  const updateItem = (index: number, field: keyof Item, value: string) =>
    form.setData(
      'items',
      form.data.items.map((item, current) =>
        current === index ? { ...item, [field]: value } : item
      )
    )
  const submit = (event: FormEvent) => {
    event.preventDefault()
    form[method](submitUrl)
  }
  return (
    <form className="builder-form" onSubmit={submit}>
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
                seront présentées dans cet ordre.
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
              <div className="item-editor" key={index}>
                <div className="item-index">{String(index + 1).padStart(2, '0')}</div>
                <div
                  className="thumb-preview"
                  style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}
                >
                  {!item.imageUrl && 'IMAGE'}
                </div>
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
