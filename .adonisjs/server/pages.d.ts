import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'about': ExtractProps<(typeof import('../../inertia/pages/about.tsx'))['default']>
    'auth/error': ExtractProps<(typeof import('../../inertia/pages/auth/error.tsx'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.tsx'))['default']>
    'dashboard': ExtractProps<(typeof import('../../inertia/pages/dashboard.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'explore': ExtractProps<(typeof import('../../inertia/pages/explore.tsx'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.tsx'))['default']>
    'playlists/create': ExtractProps<(typeof import('../../inertia/pages/playlists/create.tsx'))['default']>
    'playlists/edit': ExtractProps<(typeof import('../../inertia/pages/playlists/edit.tsx'))['default']>
    'playlists/show': ExtractProps<(typeof import('../../inertia/pages/playlists/show.tsx'))['default']>
  }
}
