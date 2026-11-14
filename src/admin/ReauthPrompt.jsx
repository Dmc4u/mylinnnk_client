import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { authHref } from '../auth/redirects.js'
import { useAuth } from '../auth/useAuth.js'
import MagneticButton from '../components/UI/MagneticButton.jsx'
import { REAUTH_CODE } from './reauth.js'

/**
 * Administration needs a recent sign-in (ADMIN_SESSION_MAX_HOURS on the server). The person is
 * still signed in to MyLinnnk, so a plain "Sign in" link would only reach the "You’re logged in"
 * screen and come straight back here. This signs the old session out first, then opens the sign-in
 * page, which returns to this admin page afterwards.
 */
export default function ReauthPrompt({ message = 'For security, administration needs a recent sign-in. Please sign in again to continue.' }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const signInAgain = async () => {
    setBusy(true)
    setError(null)
    try {
      await logout()
      navigate(authHref('login', location.pathname), { replace: true })
    } catch (e) {
      setError(e?.message || 'We couldn’t sign you out. Please try again.')
      setBusy(false)
    }
  }

  return (
    <>
      <p className="adm-reauth__text">{message}</p>
      {error && <p className="adm-error" role="alert">{error}</p>}
      <MagneticButton onClick={signInAgain} loading={busy} loadingLabel="Signing out…">
        Sign in again
      </MagneticButton>
    </>
  )
}

/** An action's result message; a "sign in again" answer offers the way to do it. */
export function AdminNotice({ notice }) {
  if (!notice) return null
  if (!notice.ok && notice.code === REAUTH_CODE) {
    return (
      <div className="adm-state adm-state--error" role="alert">
        <ReauthPrompt message={notice.text} />
      </div>
    )
  }
  return (
    <p className={notice.ok ? 'adm-ok' : 'adm-error'} role={notice.ok ? 'status' : 'alert'}>
      {notice.text}
    </p>
  )
}
