import { useId, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'

/**
 * Account settings: optional notifications. Only the routine "Email me when I sign in" can be turned on or
 * off (saved with the session's CSRF token); security alerts are always sent and say so.
 */
export default function NotificationSettings() {
  const { user, updatePreferences } = useAuth()
  const saved = Boolean(user?.preferences?.loginAlerts)
  const [pending, setPending] = useState(null) // the value being saved, shown while saving
  const [message, setMessage] = useState(null) // { tone: 'ok' | 'error', text }
  const headingId = useId()
  const labelId = useId()
  const hintId = useId()

  const change = async (event) => {
    const next = event.target.checked
    setPending(next)
    setMessage(null)
    try {
      await updatePreferences({ loginAlerts: next })
      setMessage({ tone: 'ok', text: next ? 'Sign-in emails are on.' : 'Sign-in emails are off.' })
    } catch (error) {
      setMessage({ tone: 'error', text: error?.message || 'Your setting couldn’t be saved. Please try again.' })
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="account-section" aria-labelledby={headingId}>
      <h2 id={headingId}>Notifications</h2>
      <label className="account-toggle">
        <input type="checkbox" role="switch" checked={pending ?? saved} disabled={pending !== null} onChange={change} aria-labelledby={labelId} aria-describedby={hintId} />
        <span className="account-toggle__text">
          <span id={labelId} className="account-toggle__label">
            Email me when I sign in
          </span>
          <span id={hintId} className="account-toggle__hint">
            An email each time your account is signed in, at most once every 10 minutes.
          </span>
        </span>
      </label>
      <p className="dash__lead">
        Security alerts are always sent, for example when your account is signed in on a new device or after several unsuccessful sign-in attempts.
      </p>
      <p className="account-toggle__status" role="status" aria-live="polite">
        {message?.tone === 'ok' ? message.text : ''}
      </p>
      {message?.tone === 'error' && (
        <p className="account-toggle__error" role="alert">
          {message.text}
        </p>
      )}
    </section>
  )
}
