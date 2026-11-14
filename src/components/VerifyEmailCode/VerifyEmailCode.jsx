import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../auth/messages.js'
import { useAuth } from '../../auth/useAuth.js'
import { ActionButton, FormAlert, SubmitButton, TextField } from '../Form/Form.jsx'
import './VerifyEmailCode.css'

export const CODE_LENGTH = 6
const ENTER_CODE = 'Enter the 6-digit code from the email.'

/** Keeps digits only, so pasting "123 456", "123-456" or a whole sentence still works. */
const digitsOnly = (value) => value.replace(/\D/g, '').slice(0, CODE_LENGTH)
const secondsLeft = (at, now) => Math.max(0, Math.ceil((at - now) / 1000))
const formatWait = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s} s`)

/**
 * "Enter the 6-digit code" for the signed-in user, with "Send a new code" and its cooldown.
 *
 * - The API checks everything (10-minute codes, 5 attempts, 60 s between codes); the timers shown
 *   here come from GET /auth/verification and are only a guide.
 * - The code is kept in this component's state only: never stored, logged or put in the URL.
 * - When the code is accepted, AuthProvider marks the user as verified and `onVerified` runs.
 */
export default function VerifyEmailCode({ onVerified, autoFocus = false, resendVariant = 'ghost' }) {
  const { user, getVerification, verifyEmailCode, resendVerification } = useAuth()
  const [code, setCode] = useState('')
  const [phase, setPhase] = useState('idle') // idle | checking | sending
  const [fieldError, setFieldError] = useState(null)
  const [message, setMessage] = useState(null) // { tone, text }
  const [timers, setTimers] = useState(null) // { pending, attemptsLeft, expiresAt, resendAt } (ms)
  const [now, setNow] = useState(() => Date.now())
  const busyRef = useRef(false)

  const applyState = useCallback((state) => {
    if (!state) return
    const at = Date.now()
    setNow(at)
    setTimers({ pending: state.pending, attemptsLeft: state.attemptsLeft, expiresAt: at + state.expiresIn * 1000, resendAt: at + state.resendAfter * 1000 })
  }, [])

  useEffect(() => {
    let cancelled = false
    getVerification().then(
      (state) => !cancelled && applyState(state),
      () => {
        /* timers are only a guide; the form works without them */
      },
    )
    return () => {
      cancelled = true
    }
  }, [applyState, getVerification])

  const resendIn = timers ? secondsLeft(timers.resendAt, now) : 0
  const expiresIn = timers ? secondsLeft(timers.expiresAt, now) : 0
  const ticking = resendIn > 0 || (timers?.pending && expiresIn > 0)

  useEffect(() => {
    if (!ticking) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [ticking])

  const submit = async (event) => {
    event.preventDefault()
    if (busyRef.current) return
    if (code.length !== CODE_LENGTH) {
      setFieldError(ENTER_CODE)
      return
    }
    busyRef.current = true
    setPhase('checking')
    setFieldError(null)
    setMessage(null)
    try {
      await verifyEmailCode(code)
      setCode('')
      onVerified?.()
    } catch (error) {
      const unusable = (text) => {
        setTimers((t) => (t ? { ...t, pending: false } : t))
        setMessage({ tone: 'warn', text })
      }
      if (error?.code === 'INVALID_CODE') {
        const left = error.details?.[0]?.attemptsLeft
        if (typeof left === 'number') setTimers((t) => (t ? { ...t, attemptsLeft: left } : t))
        setFieldError(error.message || ENTER_CODE)
      } else if (error?.code === 'VALIDATION_FAILED') setFieldError(ENTER_CODE)
      else if (error?.code === 'TOO_MANY_ATTEMPTS') unusable('Too many incorrect attempts. Send a new code to try again.')
      else if (error?.code === 'CODE_EXPIRED') unusable('This code has expired. Send a new code to try again.')
      else if (error?.code === 'NO_CODE' || error?.code === 'CODE_REPLACED') unusable(error.message)
      else setMessage({ tone: 'error', text: errorMessage(error) })
    } finally {
      busyRef.current = false
      setPhase('idle')
    }
  }

  const resend = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setPhase('sending')
    setFieldError(null)
    setMessage(null)
    try {
      const data = await resendVerification()
      if (data?.alreadyVerified) {
        onVerified?.()
        return
      }
      applyState(data?.verification)
      setCode('')
      setMessage({ tone: 'success', text: `We’ve sent a new code to ${user?.email ?? 'your email address'}. Older codes no longer work.` })
    } catch (error) {
      const wait = error?.code === 'RESEND_COOLDOWN' ? error.details?.[0]?.retryAfter : null
      if (typeof wait === 'number') {
        const at = Date.now()
        setNow(at)
        setTimers((t) => ({ pending: t?.pending ?? true, attemptsLeft: t?.attemptsLeft ?? 0, expiresAt: t?.expiresAt ?? 0, resendAt: at + wait * 1000 }))
      }
      setMessage({ tone: 'error', text: errorMessage(error) })
    } finally {
      busyRef.current = false
      setPhase('idle')
    }
  }

  let hint = `We sent it to ${user?.email ?? 'your email address'}.`
  if (timers?.pending && expiresIn > 0) {
    hint += ` It expires in ${formatWait(expiresIn)}.`
    if (timers.attemptsLeft < 5) hint += ` ${timers.attemptsLeft} ${timers.attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`
  } else if (timers && !timers.pending) {
    hint = 'You need a new code. Use “Send a new code” below.'
  }

  return (
    <div className="verify-code">
      {message && <FormAlert tone={message.tone}>{message.text}</FormAlert>}
      <form className="form" onSubmit={submit} noValidate aria-label="Confirm your email with a code">
        <TextField
          label="6-digit code"
          name="code"
          value={code}
          onChange={(_, value) => {
            setCode(digitsOnly(value))
            setFieldError(null)
          }}
          error={fieldError}
          hint={hint}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="••••••"
          className="field__input verify-code__input"
          autoFocus={autoFocus} // only on /verify-email, a page opened to enter exactly this

        />
        <SubmitButton busy={phase === 'checking'} busyLabel="Checking…" disabled={phase === 'sending'}>
          Confirm email
        </SubmitButton>
      </form>
      <div className="verify-code__resend">
        <p className="auth-note">Can’t find it? Check your spam folder, or ask for a new code.</p>
        <ActionButton variant={resendVariant} busy={phase === 'sending'} busyLabel="Sending…" disabled={resendIn > 0 || phase === 'checking'} onClick={resend}>
          {resendIn > 0 ? `Send a new code in ${formatWait(resendIn)}` : 'Send a new code'}
        </ActionButton>
      </div>
    </div>
  )
}
