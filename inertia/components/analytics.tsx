import { router, usePage } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

const consentKey = 'passorsmash_analytics_consent'
const measurementIdPattern = /^G-[A-Z0-9]+$/

function loadAnalytics(measurementId: string) {
  if (document.querySelector(`script[data-ga-id="${measurementId}"]`)) return

  window.dataLayer = window.dataLayer || []
  // Match Google's gtag.js snippet: commands must be pushed as Arguments objects.
  window.gtag = function gtag(..._args: unknown[]) {
    window.dataLayer.push(arguments)
  }
  // Basic consent mode: the Google script is loaded only after acceptance.
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  window.gtag('consent', 'update', { analytics_storage: 'granted' })
  window.gtag('js', new Date())
  // Inertia page views are sent manually, including the first page after consent.
  window.gtag('config', measurementId, { send_page_view: false })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  script.dataset.gaId = measurementId
  document.head.appendChild(script)
}

function sendPageView() {
  window.gtag?.('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search,
  })
}

export function trackAnalyticsEvent(name: string, parameters?: Record<string, string | number>) {
  if (typeof window === 'undefined' || !window.gtag) return
  if (localStorage.getItem(consentKey) !== 'accepted') return
  window.gtag('event', name, parameters || {})
}

export default function Analytics() {
  const { analyticsId } = usePage().props
  const measurementId = typeof analyticsId === 'string' ? analyticsId.trim() : ''
  const [consent, setConsent] = useState<'loading' | 'accepted' | 'refused' | null>('loading')
  const lastPageView = useRef('')
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  useEffect(() => {
    const open = () => {
      setPreferencesOpen(true)
      setConsent(null)
    }
    window.addEventListener('pos-cookie-preferences', open)
    return () => window.removeEventListener('pos-cookie-preferences', open)
  }, [])

  useEffect(() => {
    if (!measurementIdPattern.test(measurementId)) return
    const saved = localStorage.getItem(consentKey) as 'accepted' | 'refused' | null
    queueMicrotask(() => setConsent(saved))
  }, [measurementId])

  useEffect(() => {
    if (consent !== 'accepted' || !measurementIdPattern.test(measurementId)) return
    loadAnalytics(measurementId)
    const recordPageView = () => {
      const url = window.location.href
      if (lastPageView.current === url) return
      lastPageView.current = url
      // Let Inertia update the page title before collecting the page view.
      requestAnimationFrame(() => sendPageView())
    }
    recordPageView()
    return router.on('navigate', () => {
      recordPageView()
    })
  }, [consent, measurementId])

  const enabled = measurementIdPattern.test(measurementId)
  if ((!enabled && !preferencesOpen) || consent !== null) return null

  const choose = (value: 'accepted' | 'refused') => {
    localStorage.setItem(consentKey, value)
    setConsent(value)
    setPreferencesOpen(false)
    if (value === 'refused' && window.gtag) {
      window.gtag('consent', 'update', { analytics_storage: 'denied' })
      const domains = window.location.hostname.split('.')
      for (const cookie of document.cookie.split(';')) {
        const name = cookie.split('=')[0].trim()
        if (!name.startsWith('_ga')) continue
        document.cookie = `${name}=; Max-Age=0; path=/`
        for (let i = 0; i < domains.length - 1; i++)
          document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domains.slice(i).join('.')}`
      }
      window.location.reload()
    }
  }

  return (
    <aside className="consent-banner" aria-label="Préférences de confidentialité">
      <p>
        {enabled
          ? 'Avec ton accord, Google Analytics mesure l’audience. Tu peux refuser ou retirer ton accord à tout moment, sans bloquer le jeu.'
          : 'La mesure d’audience Google Analytics n’est pas activée. Seuls les traceurs de fonctionnement et tes préférences sont utilisés.'}{' '}
        <a href="/confidentialite">En savoir plus</a>
      </p>
      <div>
        {enabled ? (
          <>
            <button className="consent-refuse" onClick={() => choose('refused')}>
              Refuser
            </button>
            <button className="consent-accept" onClick={() => choose('accepted')}>
              Accepter
            </button>
          </>
        ) : (
          <button
            className="consent-refuse"
            onClick={() => {
              setPreferencesOpen(false)
              setConsent('refused')
            }}
          >
            Fermer
          </button>
        )}
      </div>
    </aside>
  )
}
