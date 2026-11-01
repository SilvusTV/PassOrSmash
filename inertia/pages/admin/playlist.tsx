/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Link, router } from '@inertiajs/react'
import { useState } from 'react'
import AdminShell from '~/components/admin'
import { adminDate, type AdminItem, type PlaylistSummary } from '~/admin_types'
import PublicPlaylist from '../playlists/show'

type Props = {
  playlist: PlaylistSummary & { accent: string }
  items: AdminItem[]
  revision: string
}
export default function AdminPlaylist(props: Props) {
  return <PlaylistEditor key={`${props.playlist.id}:${props.revision}`} {...props} />
}
function PlaylistEditor({ playlist, items, revision }: Props) {
  const original = {
    title: playlist.title,
    description: playlist.description || '',
    visibility: playlist.isPublic ? 'public' : 'private',
    accent: playlist.accent,
    items: items.map(({ id, title, description, image_url }) => ({
      id,
      title,
      description,
      image_url,
    })),
  }
  const [content, setContent] = useState(original)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(content) !== JSON.stringify(original)
  const updateItem = (index: number, changes: Partial<(typeof content.items)[number]>) =>
    setContent({
      ...content,
      items: content.items.map((item, i) => (i === index ? { ...item, ...changes } : item)),
    })
  const move = (index: number, offset: number) => {
    const next = [...content.items]
    ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
    setContent({ ...content, items: next })
  }
  return (
    <AdminShell
      title={playlist.title}
      description={`Playlist #${playlist.id} · ${playlist.isPublic ? 'Publique' : 'Privée'} · ${playlist.voteCount} votes`}
    >
      <div className="admin-section-heading">
        <Link href="/admin/playlists">← Toutes les playlists</Link>
        <Link href={`/admin/users/${playlist.userId}`}>Créateur : {playlist.ownerName}</Link>
      </div>
      <p>
        Créée le {adminDate(playlist.createdAt)} · Modifiée le {adminDate(playlist.updatedAt)} ·
        Identifiant : {playlist.slug}
      </p>
      <section className="admin-panel">
        <h2>Modifier la playlist</h2>
        <p>
          Les votes des éléments conservés restent enregistrés, même si leur titre ou leur image
          change. Retirer un élément supprime ses votes ; les médias partagés sont conservés.
        </p>
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault()
            setBusy(true)
            router.post(
              `/admin/playlists/${playlist.id}`,
              { ...content, expected_revision: revision },
              { onFinish: () => setBusy(false) }
            )
          }}
        >
          <fieldset disabled={busy}>
            <label>
              Titre de la playlist
              <input
                required
                minLength={3}
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
            <div className="admin-form-columns">
              <label>
                Visibilité
                <select
                  aria-label="Visibilité"
                  value={content.visibility}
                  onChange={(event) => setContent({ ...content, visibility: event.target.value })}
                >
                  <option value="public">Publique — visible dans Explorer</option>
                  <option value="private">
                    Privée — réservée à son créateur et à l’administration
                  </option>
                </select>
              </label>
              <label>
                Couleur
                <select
                  aria-label="Couleur"
                  value={content.accent}
                  onChange={(event) => setContent({ ...content, accent: event.target.value })}
                >
                  {['lime', 'violet', 'coral', 'sky'].map((accent) => (
                    <option key={accent}>{accent}</option>
                  ))}
                </select>
              </label>
            </div>
            <h3>Éléments ({content.items.length})</h3>
            {content.items.map((item, index) => (
              <article className="admin-item" key={item.id || `new-${index}`}>
                <div className="admin-item-image">
                  {item.image_url && <img src={item.image_url} alt={item.title} loading="lazy" />}
                </div>
                <div className="admin-item-fields">
                  <label>
                    Titre de l’élément {index + 1}
                    <input
                      required
                      minLength={1}
                      maxLength={120}
                      value={item.title}
                      onChange={(event) => updateItem(index, { title: event.target.value })}
                    />
                  </label>
                  <label>
                    Description de l’élément {index + 1}
                    <textarea
                      maxLength={500}
                      value={item.description}
                      onChange={(event) => updateItem(index, { description: event.target.value })}
                    />
                  </label>
                  <label>
                    URL de l’image {index + 1}
                    <input
                      required
                      value={item.image_url}
                      onChange={(event) => updateItem(index, { image_url: event.target.value })}
                    />
                  </label>
                  <div className="editorial-actions">
                    <button type="button" disabled={!index} onClick={() => move(index, -1)}>
                      Monter
                    </button>
                    <button
                      type="button"
                      disabled={index === content.items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      Descendre
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Retirer cet élément et ses votes lors de l’enregistrement ?'))
                          setContent({
                            ...content,
                            items: content.items.filter((_, i) => i !== index),
                          })
                      }}
                    >
                      Retirer cet élément
                    </button>
                  </div>
                </div>
              </article>
            ))}
            <button
              className="button"
              type="button"
              disabled={content.items.length >= 100}
              onClick={() =>
                setContent({
                  ...content,
                  items: [
                    ...content.items,
                    { id: undefined, title: '', description: '', image_url: '' },
                  ],
                })
              }
            >
              Ajouter un élément
            </button>
            <div className="admin-save-bar">
              <p role="status">
                {dirty ? 'Modifications non enregistrées.' : 'La version affichée est enregistrée.'}
              </p>
              <button
                className="button button-primary"
                type="submit"
                disabled={busy || !dirty || content.items.length < 2}
              >
                Enregistrer les modifications
              </button>
            </div>
          </fieldset>
        </form>
      </section>
      <section className="admin-panel">
        <details>
          <summary>Aperçu de la version enregistrée</summary>
          <p>Les votes de cet aperçu sont simulés.</p>
          <PublicPlaylist
            preview
            canEdit={false}
            playlist={{
              slug: playlist.slug,
              title: playlist.title,
              description: playlist.description || undefined,
              accent: playlist.accent,
              isPublic: playlist.isPublic,
            }}
            items={items.map((item) => ({
              id: item.id!,
              title: item.title,
              description: item.description,
              imageUrl: item.image_url,
              smashes: item.smashes,
              passes: item.passes,
            }))}
          />
        </details>
      </section>
      <section className="admin-panel admin-danger-zone">
        <h2>Supprimer la playlist</h2>
        <p>
          Cette action supprime la playlist, ses éléments et leurs votes. Recopiez{' '}
          <strong>{playlist.slug}</strong> pour confirmer. Les fichiers partagés ne sont pas
          supprimés.
        </p>
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault()
            setBusy(true)
            router.post(
              `/admin/playlists/${playlist.id}/delete`,
              { expected_revision: revision, confirm_slug: confirmation },
              { onFinish: () => setBusy(false) }
            )
          }}
        >
          <label>
            Identifiant de confirmation
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
            />
          </label>
          <button
            className="button admin-danger"
            disabled={busy || dirty || confirmation !== playlist.slug}
            type="submit"
          >
            Supprimer définitivement cette playlist
          </button>
        </form>
      </section>
    </AdminShell>
  )
}
