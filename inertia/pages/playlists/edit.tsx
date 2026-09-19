import { Head } from '@inertiajs/react'
import PlaylistForm from '~/components/playlist_form'
type Playlist = {
  slug: string
  title: string
  description?: string
  isPublic: boolean
  accent: 'lime' | 'violet' | 'coral' | 'sky'
}
type Item = { title: string; description?: string; imageUrl: string }
export default function EditPlaylist({ playlist, items }: { playlist: Playlist; items: Item[] }) {
  const initial = {
    title: playlist.title,
    description: playlist.description || '',
    visibility: playlist.isPublic ? ('public' as const) : ('private' as const),
    accent: playlist.accent,
    items: items.map((item) => ({ ...item, description: item.description || '' })),
  }
  return (
    <>
      <Head title={`Modifier ${playlist.title}`} />
      <section className="builder-head">
        <span className="eyebrow">Édition</span>
        <h1>
          Peaufine ton
          <br />
          <em>grand débat.</em>
        </h1>
      </section>
      <div className="builder-wrap">
        <PlaylistForm initial={initial} submitUrl={`/p/${playlist.slug}`} method="put" />
      </div>
    </>
  )
}
