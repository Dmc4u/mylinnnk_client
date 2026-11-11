import { useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog.jsx'
import { listRecoveries } from '../editor/storage/recoveryStore.js'
import { errorMessage } from './messages.js'
import { useAuth } from './useAuth.js'

/**
 * Logout that first warns when this account has edits on this device that
 * haven't reached the account yet (recovery copies from any open or closed
 * editor tab). The copies are kept: logging back in on this device offers them again.
 *
 * Returns { requestLogout, busy, error, dialog }; render `dialog` somewhere.
 */
export function useGuardedLogout({ onLoggedOut } = {}) {
  const { user, logout } = useAuth()
  const [state, setState] = useState({ confirming: false, count: 0, busy: false, error: null })

  const doLogout = async () => {
    setState((s) => ({ ...s, busy: true, error: null }))
    try {
      await logout()
      setState({ confirming: false, count: 0, busy: false, error: null })
      onLoggedOut?.()
    } catch (error) {
      setState((s) => ({ ...s, confirming: false, busy: false, error: errorMessage(error) }))
    }
  }

  const requestLogout = () => {
    const count = listRecoveries(user?.id).length
    if (count > 0) setState({ confirming: true, count, busy: false, error: null })
    else doLogout()
  }

  const dialog = state.confirming ? (
    <ConfirmDialog
      title="Log out with unsaved changes?"
      confirmLabel={state.busy ? 'Logging out…' : 'Log out anyway'}
      busy={state.busy}
      onConfirm={doLogout}
      onCancel={() => setState((s) => ({ ...s, confirming: false }))}
    >
      <p>
        {state.count === 1 ? 'One draft has changes' : `${state.count} drafts have changes`} that haven’t been saved to your account yet (for
        example, you were offline or another tab is still saving).
      </p>
      <p>They’ll stay in this browser, and you can save them when you log back in on this device. Nobody else who logs in here can see them.</p>
    </ConfirmDialog>
  ) : null

  return { requestLogout, busy: state.busy, error: state.error, dialog }
}
