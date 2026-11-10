import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import AuthLayout, { AuthPending } from '../../components/AuthLayout/AuthLayout.jsx'
import Button from '../../components/Button/Button.jsx'
import { ActionButton, FormAlert } from '../../components/Form/Form.jsx'
import ResendVerification from '../../components/ResendVerification/ResendVerification.jsx'
import { errorMessage } from '../../auth/messages.js'
import { authHref } from '../../auth/redirects.js'
import { isWellFormedToken, useOneTimeToken } from '../../auth/useOneTimeToken.js'
import { useAuth } from '../../auth/useAuth.js'

/**
 * /verify-email?token=… (link from the verification email)
 * Confirms the address automatically, once, when the page opens.
 */
export default function VerifyEmailPage() {
  const token = useOneTimeToken()
  const { status, user, verifyEmail } = useAuth()
  const [state, setState] = useState(() => (isWellFormedToken(token) ? { phase: 'verifying' } : { phase: 'invalid' }))
  const startedRef = useRef(false)

  const run = useCallback(async () => {
    setState({ phase: 'verifying' })
    try {
      await verifyEmail(token)
      setState({ phase: 'verified' })
    } catch (error) {
      if (error.code === 'INVALID_TOKEN' || error.code === 'VALIDATION_FAILED') setState({ phase: 'invalid' })
      else setState({ phase: 'error', message: errorMessage(error) })
    }
  }, [token, verifyEmail])

  useEffect(() => {
    if (startedRef.current || !isWellFormedToken(token)) return
    startedRef.current = true // React StrictMode runs effects twice in development; the link is single-use.
    // Deferred so the state update happens outside the effect body.
    queueMicrotask(run)
  }, [run, token])

  const signedIn = status === 'authenticated'

  if (state.phase === 'verifying') {
    return (
      <AuthLayout title="Confirming your email" pageTitle="Verify email">
        <AuthPending>Confirming your email address…</AuthPending>
      </AuthLayout>
    )
  }

  if (state.phase === 'verified') {
    return (
      <AuthLayout title="Email confirmed" pageTitle="Verify email">
        <FormAlert tone="success" title="Thanks, your email address is confirmed." />
        <div className="auth-actions">
          {signedIn ? <Button to="/account">Go to your account</Button> : <Button to="/login">Log in</Button>}
          <Button to="/templates" variant="ghost">
            Browse templates
          </Button>
        </div>
      </AuthLayout>
    )
  }

  if (state.phase === 'error') {
    return (
      <AuthLayout title="We couldn’t confirm your email" pageTitle="Verify email">
        <FormAlert>{state.message}</FormAlert>
        <div className="auth-actions">
          <ActionButton variant="primary" onClick={run}>
            Try again
          </ActionButton>
        </div>
      </AuthLayout>
    )
  }

  // Invalid, expired or already-used link.
  return (
    <AuthLayout title="This link can’t be used" pageTitle="Verify email">
      {signedIn && user.emailVerified ? (
        <>
          <FormAlert tone="success" title="Your email address is already confirmed." />
          <div className="auth-actions">
            <Button to="/account">Go to your account</Button>
          </div>
        </>
      ) : (
        <>
          <FormAlert tone="warn" title="This verification link is invalid or has expired.">
            <p>Verification links work once and expire after a while. If you asked for a new one, use the most recent email.</p>
          </FormAlert>
          {signedIn ? (
            <ResendVerification variant="primary" />
          ) : (
            <p className="auth-note">
              <Link to={authHref('login', '/account')}>Log in</Link> to get a new verification link.
            </p>
          )}
        </>
      )}
    </AuthLayout>
  )
}
