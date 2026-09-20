/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { Link, router } from '@inertiajs/react'
import { useState } from 'react'
import Seo from '~/components/seo'
type Playlist = {
  slug: string
  title: string
  description?: string
  accent: string
  isPublic: boolean
}
type Item = {
  id: number
  title: string
  description?: string
  imageUrl: string
  smashes: number
  passes: number
}
export default function Show({
  playlist,
  items,
  canEdit,
}: {
  playlist: Playlist
  items: Item[]
  canEdit: boolean
}) {
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [votes, setVotes] = useState<Record<number, 'smash' | 'pass'>>({})
  const item = items[index]
  const vote = (choice: 'smash' | 'pass') => {
    router.post(
      '/vote',
      { itemId: item.id, choice },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          setVotes((current) => ({ ...current, [item.id]: choice }))
          if (index < items.length - 1) setIndex(index + 1)
          else setDone(true)
        },
      }
    )
  }
  if (!items.length)
    return (
      <section className="empty-state full-page">
        <h1>Cette playlist est vide.</h1>
        {canEdit && <Link href={`/p/${playlist.slug}/edit`}>Ajouter des images</Link>}
      </section>
    )
  if (done) {
    const ranked = [...items].sort(
      (a, b) =>
        b.smashes / Math.max(1, b.smashes + b.passes) -
        a.smashes / Math.max(1, a.smashes + a.passes)
    )
    return (
      <>
        <Seo
          title={`Résultats — ${playlist.title}`}
          description={
            playlist.description || `Découvre les résultats de la playlist ${playlist.title}.`
          }
          path={`/p/${playlist.slug}`}
          noIndex={!playlist.isPublic}
        />
        <section className="results-page">
          <span className="eyebrow">Verdict final</span>
          <h1>Le classement.</h1>
          <p>Tu as donné ton avis sur les {items.length} images.</p>
          <div className="results-list">
            {ranked.map((entry, rank) => {
              const personalVote = votes[entry.id]
              return (
                <article
                  className={personalVote ? `personal-${personalVote}` : undefined}
                  key={entry.id}
                >
                  <b>#{rank + 1}</b>
                  <img src={entry.imageUrl} alt="" />
                  <div className="result-copy">
                    <h2>{entry.title}</h2>
                    <span>
                      {Math.round(
                        (entry.smashes / Math.max(1, entry.smashes + entry.passes)) * 100
                      )}
                      % Smash dans la communauté
                    </span>
                  </div>
                  <strong className={`personal-vote ${personalVote || ''}`}>
                    <small>TON CHOIX</small>
                    {personalVote === 'smash' ? '♥ SMASH' : '✕ PASS'}
                  </strong>
                </article>
              )
            })}
          </div>
          <div className="results-actions">
            <button
              className="button button-primary"
              onClick={() => {
                setIndex(0)
                setDone(false)
                setVotes({})
              }}
            >
              Rejouer
            </button>
            <Link className="outline-button" href="/explore">
              Explorer
            </Link>
          </div>
        </section>
      </>
    )
  }
  const total = item.smashes + item.passes
  const percent = total ? Math.round((item.smashes / total) * 100) : 50
  return (
    <>
      <Seo
        title={`${playlist.title} — Smash ou Pass`}
        description={
          playlist.description ||
          `Donne ton verdict sur ${playlist.title} dans ce jeu Smash or Pass gratuit.`
        }
        path={`/p/${playlist.slug}`}
        image={item.imageUrl}
        noIndex={!playlist.isPublic}
      />
      <section className={`play-page accent-${playlist.accent}`}>
        <div className="play-top">
          <div>
            <span className="eyebrow">Smash ou Pass</span>
            <h1>{playlist.title}</h1>
          </div>
          <div className="play-controls">
            {canEdit && <Link href={`/p/${playlist.slug}/edit`}>Modifier</Link>}
            <button onClick={() => navigator.clipboard.writeText(location.href)}>Partager ↗</button>
          </div>
        </div>
        <div className="play-grid">
          <div className="play-visual">
            <img src={item.imageUrl} alt={item.title} />
            <div className="progress-dots">
              {items.map((_, dot) => (
                <i className={dot <= index ? 'active' : ''} key={dot} />
              ))}
            </div>
          </div>
          <aside className="play-detail">
            <div>
              <span className="item-count">
                {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
              </span>
              <span className="micro-label">TON VERDICT ?</span>
              <h2>{item.title}</h2>
              <p>
                {item.description || 'À toi de décider. Fais confiance à ton premier instinct.'}
              </p>
            </div>
            <div className="community-score">
              <div>
                <span>La communauté</span>
                <b>{total ? `${percent}% Smash` : 'Sois le premier'}</b>
              </div>
              <div className="score-track">
                <span style={{ width: `${percent}%` }} />
              </div>
            </div>
          </aside>
        </div>
        <div className="vote-actions">
          <button className="vote-pass" onClick={() => vote('pass')}>
            <i>✕</i>
            <span>
              <small>NON MERCI</small>PASS
            </span>
          </button>
          <button className="vote-smash" onClick={() => vote('smash')}>
            <span>
              <small>VALIDÉ</small>SMASH
            </span>
            <i>♥</i>
          </button>
        </div>
      </section>
    </>
  )
}
