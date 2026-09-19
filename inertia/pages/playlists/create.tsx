import { Head } from '@inertiajs/react'
import PlaylistForm from '~/components/playlist_form'
export default function CreatePlaylist() {
  return (
    <>
      <Head title="Créer une playlist" />
      <section className="builder-head">
        <span className="eyebrow">Studio de création</span>
        <h1>
          Ta playlist.
          <br />
          <em>Tes règles.</em>
        </h1>
        <p>Prépare le prochain grand débat en quelques minutes.</p>
      </section>
      <div className="builder-wrap">
        <PlaylistForm submitUrl="/playlists" />
      </div>
    </>
  )
}
