import { usePage } from '@inertiajs/react'
export default function AuthOptions() {
  return (
    <div className="auth-options">
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
