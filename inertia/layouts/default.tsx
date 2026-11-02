/* eslint-disable @adonisjs/prefer-adonisjs-inertia-link */
import { toast, Toaster } from 'sonner'
import { Head, Link, router, usePage } from '@inertiajs/react'
import { type ReactElement, useEffect, useRef, useState, useSyncExternalStore } from 'react'
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
function subscribeTheme(listener: () => void) {
  window.addEventListener('pos-theme', listener)
  return () => window.removeEventListener('pos-theme', listener)
}
const readTheme = () =>
  document.documentElement.dataset.theme === 'dark' ? ('dark' as const) : ('light' as const)
const serverTheme = () => 'light' as const

export default function Layout({ children }: { children: ReactElement }) {
  const { url, flash, props } = usePage()
  const [accountOpen, setAccountOpen] = useState(false)
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme)
  const accountRef = useRef<HTMLDivElement>(null)
  useEffect(() => router.on('navigate', () => setAccountOpen(false)), [])
  useEffect(() => {
    if (!accountOpen) return
    const close = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false)
        accountRef.current?.querySelector<HTMLButtonElement>('.avatar-button')?.focus()
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [accountOpen])
  const chooseTheme = (next: 'light' | 'dark') => {
    document.documentElement.dataset.theme = next
    window.dispatchEvent(new Event('pos-theme'))
    try {
      localStorage.setItem('pos_theme', next)
    } catch {
      /* Storage can be unavailable. */
    }
  }
  const user = props.user as
    { fullName?: string; username?: string; avatarUrl?: string; initials?: string } | undefined
  const isPrivatePage =
    url.startsWith('/dashboard') ||
    url.startsWith('/profile') ||
    url === '/admin' ||
    url.startsWith('/admin/') ||
    url.startsWith('/oauth/') ||
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
              {props.editorialAdmin && <Link href="/admin">Administration</Link>}
              <Link href="/playlists/create" className="nav-cta">
                Créer
              </Link>
              <div
                className="account-control"
                ref={accountRef}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setAccountOpen(false)
                }}
              >
                <button
                  className="avatar-button"
                  type="button"
                  aria-label="Mon compte"
                  aria-expanded={accountOpen}
                  aria-controls="account-panel"
                  onClick={() => setAccountOpen(!accountOpen)}
                >
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.initials}
                </button>
                {accountOpen && (
                  <div className="account-panel" id="account-panel">
                    <strong>{user.fullName || user.username || 'Mon compte'}</strong>
                    <fieldset className="theme-picker">
                      <legend>Apparence</legend>
                      <button
                        type="button"
                        aria-pressed={theme === 'light'}
                        onClick={() => chooseTheme('light')}
                      >
                        Clair
                      </button>
                      <button
                        type="button"
                        aria-pressed={theme === 'dark'}
                        onClick={() => chooseTheme('dark')}
                      >
                        Foncé
                      </button>
                    </fieldset>
                    <Link href="/profile">Voir mon profil</Link>
                    <Link href="/dashboard">Mes playlists</Link>
                    {props.editorialAdmin && <Link href="/admin">Administration</Link>}
                    <Form route="auth.logout">
                      <button className="account-logout" type="submit">
                        Se déconnecter
                      </button>
                    </Form>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link className="nav-cta" href="/login">
              Se connecter
            </Link>
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
          <a href="mailto:contact@passorsmash.fr">Contact</a>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/cgu">CGU</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <button
            className="footer-cookie-button"
            type="button"
            onClick={() => window.dispatchEvent(new Event('pos-cookie-preferences'))}
          >
            Gérer les cookies
          </button>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
      <Toaster position="top-center" richColors theme={theme} />
      <Analytics />
    </div>
  )
}
