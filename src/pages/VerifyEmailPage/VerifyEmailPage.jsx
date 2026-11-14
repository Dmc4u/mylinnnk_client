import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import AuthLayout, { AuthPending } from '../../components/AuthLayout/AuthLayout.jsx'
import Button from '../../components/Button/Button.jsx'
import { ActionButton, FormAlert } from '../../components/Form/Form.jsx'
import VerifyEmailCode from '../../components/VerifyEmailCode/VerifyEmailCode.jsx'
import { errorMessage } from '../../auth/messages.js'
import { DEFAULT_AFTER_AUTH, authHref, safeNextPath } from '../../auth/redirects.js'
import { isWellFormedToken, useOneTimeToken } from '../../auth/useOneTimeToken.js'
import { useAuth } from '../../auth/useAuth.js'

/**
 * /verify-email[?next=/path]: the signed-in user enters the 6-digit code from the verification email
 * (new accounts land here after signing up).
 * /verify-email?token=…: a verification link sent before codes existed; it still works, once.
 */
export default function VerifyEmailPage() {
  const token = useOneTimeToken() // read once, then removed from the address bar
  return token === null ? <VerifyWithCode /> : <VerifyWithLink token={token} />
}

function continueLabel(next) {
  return next === DEFAULT_AFTER_AUTH ? 'Go to your account' : 'Continue'
}

function VerifyWithCode() {
  const { status, user, refreshSession } = useAuth()
  const [params] = useSearchParams()
  const location = useLocation()
  const next = safeNextPath(params.get('next'))
  const welcome = location.state?.welcome === true
  const emailSent = location.state?.verificationEmailSent !== false
  const [justVerified, setJustVerified] = useState(false)
  const [retrying, setRetrying] = useState(false)

  if (status === 'loading') {
    return (
      <AuthLayout title="Confirm your email" pageTitle="Verify email">
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
      <AuthLayout title="Confirm your email" pageTitle="Verify email">
        <FormAlert tone="warn" title="We can’t reach MyLinnnk right now." />
        <div className="auth-actions">
          <ActionButton variant="primary" busy={retrying} busyLabel="Checking…" onClick={retry}>
            Try again
          </ActionButton>
        </div>
      </AuthLayout>
    )
  }

  if (status !== 'authenticated') {
    return (
      <AuthLayout title="Confirm your email" pageTitle="Verify email">
        <p className="auth-note">
          <Link to={authHref('login', '/account')}>Log in</Link> to enter the code from your verification email.
        </p>
      </AuthLayout>
    )
  }

  if (user.emailVerified) {
    return (
      <AuthLayout title="Email confirmed" pageTitle="Verify email">
        <FormAlert tone="success" title={justVerified ? 'Thanks, your email address is confirmed.' : 'Your email address is already confirmed.'} />
        <div className="auth-actions">
          <Button to={next}>{continueLabel(next)}</Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Check your email" pageTitle="Verify email" lead={`Enter the 6-digit code we sent to ${user.email}. It’s valid for 10 minutes.`}>
      {welcome && (
        <FormAlert tone={emailSent ? 'success' : 'warn'} title={`Welcome to MyLinnnk, ${user.displayName}!`}>
          {!emailSent && <p>We couldn’t send your verification email just now. Use “Send a new code” below.</p>}
        </FormAlert>
      )}
      <VerifyEmailCode autoFocus onVerified={() => setJustVerified(true)} />
      <p className="auth-note">
        <Link to={next}>Skip for now</Link>. You can confirm your email later from your account.
      </p>
    </AuthLayout>
  )
}

function VerifyWithLink({ token }) {
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
            <p>We now confirm email addresses with a 6-digit code instead. {signedIn ? 'Enter the latest code we sent, or ask for a new one.' : ''}</p>
          </FormAlert>
          {signedIn ? (
            <VerifyEmailCode resendVariant="primary" />
          ) : (
            <p className="auth-note">
              <Link to={authHref('login', '/account')}>Log in</Link> to get a verification code.
            </p>
          )}
        </>
      )}
    </AuthLayout>
  )
}
