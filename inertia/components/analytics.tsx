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

  if (!measurementIdPattern.test(measurementId) || consent !== null) return null

  const choose = (value: 'accepted' | 'refused') => {
    localStorage.setItem(consentKey, value)
    setConsent(value)
  }

  return (
    <aside className="consent-banner" aria-label="Préférences de confidentialité">
      <p>
        Nous utilisons Google Analytics, avec ton accord, pour mesurer l’audience et améliorer le
        site. Aucun suivi n’est lancé avant ton choix.
      </p>
      <div>
        <button className="consent-refuse" onClick={() => choose('refused')}>
          Refuser
        </button>
        <button className="consent-accept" onClick={() => choose('accepted')}>
          Accepter
        </button>
      </div>
    </aside>
  )
}
