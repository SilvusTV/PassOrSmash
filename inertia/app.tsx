import './css/app.css'
import { type ReactElement } from 'react'
import { client } from './client'
import Layout from '~/layouts/default'
import { type Data } from '@generated/data'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'

const appName = import.meta.env.VITE_APP_NAME || 'Pass or Smash'

createInertiaApp({
  title: (title) => (title && title !== appName ? `${title} | ${appName}` : appName),
  resolve: (name) => {
    return resolvePageComponent<ResolvedComponent>(
      `./pages/${name}.tsx`,
      import.meta.glob<ResolvedComponent>('./pages/**/*.tsx'),
      (page: ReactElement<Data.SharedProps>) => <Layout children={page} />
    )
  },
  setup({ el, App, props }) {
    const app = (
      <TuyauProvider client={client}>
        <App {...props} />
      </TuyauProvider>
    )

    if (el.hasChildNodes()) hydrateRoot(el, app)
    else createRoot(el).render(app)
  },
  progress: {
    color: '#C7FF3D',
  },
})
