import { usePage } from '@inertiajs/react'
export default function AuthOptions() {
  return (
    <div className="auth-options">
      <p className="auth-legal-note">
        Retrouve les <a href="/cgu">règles d’utilisation</a> et les informations sur{' '}
        <a href="/confidentialite">tes données</a> avant de créer ton compte.
      </p>
      {usePage().props.googleEnabled && (
        <a className="button auth-provider" href="/auth/google">
          Continuer avec Google
        </a>
      )}
      <a className="button auth-provider" href="/auth/discord">
        Continuer avec Discord
      </a>
    </div>
  )
}
