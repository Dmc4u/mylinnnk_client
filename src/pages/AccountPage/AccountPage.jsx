import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import AuthLayout, { AuthPending } from '../../components/AuthLayout/AuthLayout.jsx'
import Button from '../../components/Button/Button.jsx'
import { ActionButton, FormAlert } from '../../components/Form/Form.jsx'
import ResendVerification from '../../components/ResendVerification/ResendVerification.jsx'
import { errorMessage } from '../../auth/messages.js'
import { authHref } from '../../auth/redirects.js'
import { useAuth } from '../../auth/useAuth.js'
import './AccountPage.css'

const formatDate = (iso) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * /account: who is signed in, email verification and log out.
 * (The full dashboard with saved pages comes in a later stage.)
 */
export default function AccountPage() {
  const { status, user, notice, logout, refreshSession } = useAuth()
  const location = useLocation()
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const welcome = location.state?.welcome === true
  const verificationEmailSent = location.state?.verificationEmailSent !== false

  if (status === 'loading') {
    return (
      <AuthLayout title="Your account" pageTitle="Account">
        <AuthPending>Checking your session…</AuthPending>
      </AuthLayout>
    )
  }

  if (status === 'unavailable') {
    const retry = async () => {
      setRetrying(true)
      await refreshSession()
      setRetrying(false)
    }
    return (
      <AuthLayout title="Your account" pageTitle="Account">
        <FormAlert tone="warn" title="We can’t reach MyLinnnk right now.">
          <p>Your account details can’t be loaded at the moment. You can still browse templates and edit as a guest.</p>
        </FormAlert>
        <div className="auth-actions">
          <ActionButton variant="primary" busy={retrying} busyLabel="Checking…" onClick={retry}>
            Try again
          </ActionButton>
        </div>
      </AuthLayout>
    )
  }

  // Just logged out here or in another tab: go home. Otherwise (never signed in, expired): log in first.
  if (status !== 'authenticated') return <Navigate to={notice === 'signed-out' ? '/' : authHref('login', '/account')} replace />

  const onLogout = async () => {
    setLoggingOut(true)
    setError(null)
    try {
      await logout() // the page then redirects home (see above)
    } catch (e) {
      setError(errorMessage(e))
      setLoggingOut(false)
    }
  }

  const memberSince = formatDate(user.createdAt)
  const initial = (user.displayName.trim()[0] ?? '?').toUpperCase()

  return (
    <AuthLayout title="Your account" pageTitle="Account" wide>
      {welcome && (
        <FormAlert tone={verificationEmailSent ? 'success' : 'warn'} title={`Welcome to MyLinnnk, ${user.displayName}!`}>
          <p>
            {verificationEmailSent
              ? `We’ve sent a link to ${user.email}. Open it to confirm your email address.`
              : 'We couldn’t send your verification email just now. You can send a new one below.'}
          </p>
        </FormAlert>
      )}
      <FormAlert>{error}</FormAlert>

      <div className="account-profile">
        <span className="account-profile__avatar" aria-hidden="true">
          {initial}
        </span>
        <div className="account-profile__text">
          <p className="account-profile__name">{user.displayName}</p>
          <p className="account-profile__email">{user.email}</p>
        </div>
      </div>

      <dl className="account-details">
        <div>
          <dt>Email</dt>
          <dd>
            {user.emailVerified ? (
              <span className="account-badge account-badge--ok">Confirmed</span>
            ) : (
              <span className="account-badge account-badge--pending">Not confirmed yet</span>
            )}
          </dd>
        </div>
        {memberSince && (
          <div>
            <dt>Member since</dt>
            <dd>{memberSince}</dd>
          </div>
        )}
      </dl>

      {!user.emailVerified && (
        <section className="account-section" aria-labelledby="verify-heading">
          <h2 id="verify-heading">Confirm your email</h2>
          <p>Confirming your email lets you recover your account. Check your inbox for our link, or send a new one.</p>
          <ResendVerification />
        </section>
      )}

      <section className="account-section" aria-labelledby="drafts-heading">
        <h2 id="drafts-heading">Your pages</h2>
        <p>
          Saving pages to your account is coming soon. Until then, drafts you create stay saved in this browser, whether or not you’re logged in.
        </p>
        <div className="auth-actions auth-actions--start">
          <Button to="/templates" variant="ghost" size="sm">
            Browse templates
          </Button>
        </div>
      </section>

      <div className="account-footer">
        <ActionButton busy={loggingOut} busyLabel="Logging out…" onClick={onLogout}>
          Log out
        </ActionButton>
        <p className="auth-note">
          Forgot your password? <Link to="/forgot-password">Reset it</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
