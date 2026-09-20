/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { toast, Toaster } from 'sonner'
import { Head, Link, usePage } from '@inertiajs/react'
import { type ReactElement, useEffect } from 'react'
import { Form } from '@adonisjs/inertia/react'
import Analytics from '~/components/analytics'

function Brand() {
  return (
    <span className="brand">
      <span>PASS</span>
      <i>or</i>
      <strong>SMASH</strong>
    </span>
  )
}

export default function Layout({ children }: { children: ReactElement }) {
  const { url, flash, props } = usePage()
  const user = props.user as
    { fullName?: string; username?: string; avatarUrl?: string; initials?: string } | undefined
  const isPrivatePage =
    url.startsWith('/dashboard') ||
    url.startsWith('/auth/') ||
    url.startsWith('/login') ||
    url.startsWith('/signup') ||
    url.startsWith('/playlists/') ||
    url.endsWith('/edit')

  useEffect(() => {
    toast.dismiss()
  }, [url])
  useEffect(() => {
    if (flash.error) toast.error(flash.error)
    if (flash.success) toast.success(flash.success)
  }, [flash])

  return (
    <div className="site-shell">
      {isPrivatePage && (
        <Head>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
      )}
      <header className="nav-wrap">
        <Link href="/" aria-label="Retour à l’accueil">
          <Brand />
        </Link>
        <nav aria-label="Navigation principale">
          <Link href="/jeu-smash-or-pass" className={url === '/jeu-smash-or-pass' ? 'active' : ''}>
            Le jeu
          </Link>
          <Link href="/explore" className={url === '/explore' ? 'active' : ''}>
            Explorer
          </Link>
          {user ? (
            <>
              <Link href="/dashboard">Mes playlists</Link>
              <Link href="/playlists/create" className="nav-cta">
                Créer
              </Link>
              <Form route="auth.logout">
                <button className="avatar-button" type="submit" title="Se déconnecter">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.initials}
                </button>
              </Form>
            </>
          ) : (
            <a className="discord-button" href="/auth/discord">
              <span aria-hidden="true">◈</span> Se connecter avec Discord
            </a>
          )}
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <Brand />
        <p>Des choix simples. Des débats sans fin.</p>
        <div>
          <Link href="/jeu-smash-or-pass">Le jeu</Link>
          <Link href="/explore">Explorer</Link>
          <a href="mailto:hello@passorsmash.fr">Contact</a>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
      <Toaster position="top-center" richColors theme="dark" />
      <Analytics />
    </div>
  )
}
