import { useCallback, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router'
import AuthLayout, { AuthPending } from '../../components/AuthLayout/AuthLayout.jsx'
import { ActionButton, FormAlert } from '../../components/Form/Form.jsx'
import { useGuardedLogout } from '../../auth/useGuardedLogout.jsx'
import { cloudDraftApi } from '../../editor/services/cloudDrafts.js'
import { useDashboardData } from './dashboardData.js'
import { authHref } from '../../auth/redirects.js'
import { useAuth } from '../../auth/useAuth.js'
import './AccountPage.css'

/** The dashboard's views (React Router routes under /dashboard, see App.jsx). */
const DASHBOARD_VIEWS = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/publications', label: 'Published pages' },
  { to: '/dashboard/drafts', label: 'Drafts' },
  { to: '/dashboard/payments', label: 'Payments' },
  { to: '/dashboard/support', label: 'Help & support' },
  { to: '/dashboard/account', label: 'Account' },
]

/**
 * /dashboard/*: the customer dashboard layout. Checks the session (log in first if needed), then shows a
 * persistent navigation with the active view highlighted and the view itself (<Outlet>). The account's
 * publications, orders and drafts are loaded once here (owner-only endpoints) and shared with the views.
 */
export default function AccountPage() {
  const { status, user, notice, refreshSession } = useAuth()
  const { pathname } = useLocation()
  const [retrying, setRetrying] = useState(false)

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
  if (status !== 'authenticated') return <Navigate to={notice === 'signed-out' ? '/' : authHref('login', pathname)} replace />

  return <DashboardShell user={user} />
}

/** Signed in: the layout and the shared data (rendered only once the session is known). */
function DashboardShell({ user }) {
  const data = useDashboardData()
  const guardedLogout = useGuardedLogout()
  const [drafts, setDrafts] = useState(null)
  const location = useLocation()

  const loadDrafts = useCallback(async () => {
    try {
      setDrafts(await cloudDraftApi.list())
    } catch {
      setDrafts(null) // the count shows as not loaded; the Drafts view explains the problem
    }
  }, [])
  useEffect(() => {
    queueMicrotask(loadDrafts)
  }, [loadDrafts])

  const initial = (user.displayName.trim()[0] ?? '?').toUpperCase()
  const context = {
    user,
    data,
    drafts,
    onDrafts: setDrafts,
    guardedLogout,
    welcome: location.state?.welcome === true,
    verificationEmailSent: location.state?.verificationEmailSent !== false,
  }

  return (
    <div className="dash">
      <aside className="dash__side">
        <div className="dash__who">
          <span className="account-profile__avatar" aria-hidden="true">
            {initial}
          </span>
          <div className="dash__who-text">
            <p className="dash__who-name">{user.displayName}</p>
            <p className="dash__who-email">{user.email}</p>
          </div>
        </div>
        <nav className="dash__nav" aria-label="Dashboard">
          {DASHBOARD_VIEWS.map((v) => (
            <NavLink key={v.to} to={v.to} end={v.end}>
              {v.label}
            </NavLink>
          ))}
        </nav>
        {/* Logging out is available from every view (it warns first if this device holds unsaved changes). */}
        <ActionButton className="dash__logout" busy={guardedLogout.busy} busyLabel="Logging out…" onClick={guardedLogout.requestLogout}>
          Log out
        </ActionButton>
      </aside>

      <div className="dash__main" key={location.pathname}>
        <FormAlert>{guardedLogout.error}</FormAlert>
        {guardedLogout.dialog}
        <Outlet context={context} />
      </div>
    </div>
  )
}
