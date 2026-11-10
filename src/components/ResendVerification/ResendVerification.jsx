import { useState } from 'react'
import { errorMessage } from '../../auth/messages.js'
import { useAuth } from '../../auth/useAuth.js'
import { ActionButton, FormAlert } from '../Form/Form.jsx'

/** "Send a new verification email" for the signed-in user, with its own feedback. */
export default function ResendVerification({ label = 'Send a new verification email', variant = 'ghost' }) {
  const { user, resendVerification } = useAuth()
  const [state, setState] = useState({ phase: 'idle', message: null })

  const send = async () => {
    setState({ phase: 'sending', message: null })
    try {
      const result = await resendVerification()
      setState(
        result?.alreadyVerified
          ? { phase: 'done', tone: 'success', message: 'Your email address is already confirmed.' }
          : { phase: 'done', tone: 'success', message: `We’ve sent a new link to ${user?.email ?? 'your email address'}. Older links no longer work.` },
      )
    } catch (error) {
      setState({ phase: 'error', tone: 'error', message: errorMessage(error) })
    }
  }

  return (
    <div className="resend-verification">
      {state.message && <FormAlert tone={state.tone}>{state.message}</FormAlert>}
      {state.phase !== 'done' && (
        <ActionButton variant={variant} busy={state.phase === 'sending'} busyLabel="Sending…" onClick={send}>
          {label}
        </ActionButton>
      )}
    </div>
  )
}
