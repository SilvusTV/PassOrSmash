import { router, usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

const consentKey = 'passorsmash_analytics_consent'

function loadAnalytics(measurementId: string) {
  if (!measurementId || document.querySelector(`script[data-ga-id="${measurementId}"]`)) return

  window.dataLayer = window.dataLayer || []
  window.gtag = (...args: unknown[]) => window.dataLayer.push(args)
  window.gtag('js', new Date())
  window.gtag('config', measurementId, { anonymize_ip: true })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  script.dataset.gaId = measurementId
  document.head.appendChild(script)
}

export default function Analytics() {
  const { analyticsId } = usePage().props
  const measurementId = typeof analyticsId === 'string' ? analyticsId.trim() : ''
  const [consent, setConsent] = useState<'loading' | 'accepted' | 'refused' | null>('loading')

  useEffect(() => {
    if (!measurementId) return
    const saved = localStorage.getItem(consentKey) as 'accepted' | 'refused' | null
    queueMicrotask(() => setConsent(saved))
    if (saved === 'accepted') loadAnalytics(measurementId)
  }, [measurementId])

  useEffect(() => {
    if (consent !== 'accepted' || !measurementId) return
    loadAnalytics(measurementId)
    return router.on('navigate', (event) => {
      window.gtag?.('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: event.detail.page.url,
      })
    })
  }, [consent, measurementId])

  if (!measurementId || consent !== null) return null

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
