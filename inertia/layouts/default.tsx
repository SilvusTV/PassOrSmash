/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { toast, Toaster } from 'sonner'
import { Link, usePage } from '@inertiajs/react'
import { type ReactElement, useEffect } from 'react'
import { Form } from '@adonisjs/inertia/react'

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

  useEffect(() => {
    toast.dismiss()
  }, [url])
  useEffect(() => {
    if (flash.error) toast.error(flash.error)
    if (flash.success) toast.success(flash.success)
  }, [flash])

  return (
    <div className="site-shell">
      <header className="nav-wrap">
        <Link href="/" aria-label="Retour à l’accueil">
          <Brand />
        </Link>
        <nav aria-label="Navigation principale">
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
          <Link href="/explore">Explorer</Link>
          <a href="mailto:hello@passorsmash.fr">Contact</a>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
      <Toaster position="top-center" richColors theme="dark" />
    </div>
  )
}
