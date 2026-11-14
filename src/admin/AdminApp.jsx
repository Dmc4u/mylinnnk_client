import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router'
import { authHref } from '../auth/redirects.js'
import { useAuth } from '../auth/useAuth.js'
import AuthLayout from '../components/AuthLayout/AuthLayout.jsx'
import Logo from '../components/Brand/Logo.jsx'
import '../components/Button/Button.css'
import Footer from '../components/Footer/Footer.jsx'
import Header from '../components/Header/Header.jsx'
import NeonRingLoader from '../components/Loading/NeonRingLoader.jsx'
import MagneticButton from '../components/UI/MagneticButton.jsx'
import useDelayedLoading from '../hooks/useDelayedLoading.js'
import { AdminPaymentDetail, AdminPayments } from './AdminPayments.jsx'
import ReauthPrompt, { AdminNotice } from './ReauthPrompt.jsx'
import { REAUTH_CODE, needsReauth } from './reauth.js'
import StateView, { AdminHeading, StatusChip } from './StateView.jsx'
import { adminApi, money, useAdminData, when } from './adminApi.js'
import './admin.css'

const NAV = [
  { to: '/admin', label: 'Overview', end: true, icon: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z' },
  { to: '/admin/users', label: 'Users', icon: 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.7 0-6 1.3-6 3.5V19h12v-2.5C14 14.3 10.7 13 8 13Zm8 0c-.3 0-.7 0-1 .1 1.2.8 2 1.9 2 3.4V19h5v-2.5c0-2.2-3.3-3.5-6-3.5Z' },
  { to: '/admin/publications', label: 'Publications', icon: 'M5 4h14v16H5V4Zm3 4h8M8 12h8M8 16h5' },
  { to: '/admin/payments', label: 'Payment reviews', icon: 'M3 7h18v10H3V7Zm0 3h18M7 14h3' },
  { to: '/admin/transactions', label: 'Transactions', icon: 'M7 7h11l-3-3M17 17H6l3 3' },
  { to: '/admin/audit', label: 'Audit log', icon: 'M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6l-7-3Zm-3 9 2 2 4-4' },
  { to: '/admin/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.5a7.6 7.6 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-.9c.6.5 1.3.9 2 1.2l.4 2.5h5l.4-2.5c.7-.3 1.4-.7 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z' },
]

const Icon = ({ d }) => (
  <svg className="adm-nav__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={d} />
  </svg>
)

/**
 * Screens shown before the dashboard (signed out, no access, sign in again) use the site's own shell:
 * the MyLinnnk header and footer around the same card as the account pages.
 */
function AdminGate({ title, lead, children, alert = false }) {
  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" className="app__main">
        <AuthLayout title={title} pageTitle={`${title} · Administration`} lead={lead}>
          <div className="adm-gate" role={alert ? 'alert' : undefined}>{children}</div>
        </AuthLayout>
      </main>
      <Footer />
    </div>
  )
}

/**
 * /admin/* — the administration dashboard, part of the MyLinnnk app (same design tokens, logo, buttons and
 * loaders). The server decides access for every request (requireAdmin: the one designated admin account);
 * this shell asks /admin/me and only shows the dashboard when the server says you are the admin. Nothing
 * here grants or hides anything the server would allow: it only displays what the server returns.
 */
export default function AdminApp() {
  const { status, isAdmin, refreshSession } = useAuth()
  const location = useLocation()
  const me = useAdminData(() => adminApi.me(), [status])
  // The server just said this session is not (or no longer) the admin, or has ended: re-read the session
  // so the rest of the app (e.g. the Admin Dashboard link) stops showing admin access right away.
  const staleAdmin = isAdmin && (me.error?.status === 403 || (me.error?.status === 401 && me.error?.code !== REAUTH_CODE))
  useEffect(() => {
    if (staleAdmin) refreshSession()
  }, [staleAdmin, refreshSession])
  const checking = status === 'loading' || (status === 'authenticated' && me.status === 'loading')
  const showLoader = useDelayedLoading(checking)

  if (checking) {
    return <main className="adm-checking" aria-busy="true">{showLoader && <NeonRingLoader mode="full-page" size="lg" message="Opening administration…" />}</main>
  }
  if (status !== 'authenticated') {
    return (
      <AdminGate title="Administration" lead="Please sign in with the MyLinnnk administrator account.">
        <MagneticButton to={authHref('login', location.pathname)} variant="primary">Sign in</MagneticButton>
      </AdminGate>
    )
  }
  if (needsReauth(me.error)) {
    // Signed in to MyLinnnk, but the session is too old for administration (or no longer valid).
    return (
      <AdminGate title="Administration">
        <ReauthPrompt message={me.error?.code === REAUTH_CODE ? undefined : 'Your session has ended. Please sign in again.'} />
      </AdminGate>
    )
  }
  if (me.status === 'error') {
    const denied = me.error.status === 403
    return (
      <AdminGate title={denied ? 'No access' : 'Administration unavailable'} alert>
        <p className="adm-gate__text">{denied ? 'This account doesn’t have administrator access.' : me.error.message}</p>
        <MagneticButton to="/" variant="navy">Back to MyLinnnk</MagneticButton>
      </AdminGate>
    )
  }
  return <AdminShell user={me.data.user} />
}

/** The signed-in dashboard: top bar, sidebar (a drawer on small screens) and the current section. */
function AdminShell({ user }) {
  const { logout } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openedAt, setOpenedAt] = useState(pathname)
  const toggleRef = useRef(null)
  const drawerRef = useRef(null)
  const drawerId = useId()

  // Choosing a section closes the drawer (state reset during render, keyed by the path it opened on).
  if (menuOpen && openedAt !== pathname) setMenuOpen(false)

  useEffect(() => {
    if (!menuOpen) return undefined
    drawerRef.current?.querySelector('a')?.focus()
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      toggleRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const toggleMenu = () => {
    setOpenedAt(pathname)
    setMenuOpen((open) => !open)
  }

  return (
    <div className={`adm${menuOpen ? ' adm--menu-open' : ''}`}>
      <a className="skip-link" href="#adm-main">Skip to content</a>
      <title>Administration · MyLinnnk</title>
      <meta name="robots" content="noindex" />
      <header className="adm-top">
        <button ref={toggleRef} type="button" className="adm-top__toggle" aria-expanded={menuOpen} aria-controls={drawerId} onClick={toggleMenu}>
          <span className="sr-only">{menuOpen ? 'Close admin menu' : 'Open admin menu'}</span>
          <span className="adm-top__toggle-bar" aria-hidden="true" />
          <span className="adm-top__toggle-bar" aria-hidden="true" />
        </button>
        <Link to="/admin" className="adm-top__brand" aria-label="MyLinnnk administration overview">
          <Logo size={32} />
          <span className="adm-top__badge">Admin</span>
        </Link>
        {import.meta.env.DEV && <span className="adm-devtag">Local development</span>}
        <div className="adm-top__actions">
          <Link to="/" className="btn btn--ghost btn--sm adm-top__site">View site</Link>
          <span className="adm-who">
            <span className="adm-who__avatar" aria-hidden="true">{(user.displayName || '?').slice(0, 1).toUpperCase()}</span>
            <span className="adm-who__text"><span className="adm-who__name">{user.displayName}</span> · <b>Admin</b></span>
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => logout()}>Sign out</button>
        </div>
      </header>

      <div className="adm-body">
        <aside ref={drawerRef} id={drawerId} className="adm-side" aria-label="Admin menu">
          <nav className="adm-nav" aria-label="Administration">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className="adm-nav__link">
                <Icon d={n.icon} />
                <span>{n.label}</span>
              </NavLink>
            ))}
          </nav>
          <nav className="adm-side__exit" aria-label="Leave administration">
            <Link to="/" className="adm-side__link">← Back to MyLinnnk</Link>
            <Link to="/account" className="adm-side__link">Your account</Link>
          </nav>
        </aside>
        {menuOpen && <div className="adm-scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />}
        <main id="adm-main" className="adm-main" tabIndex={-1}>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="users" element={<Users />} />
            <Route path="publications" element={<Publications />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="payments/:reference" element={<AdminPaymentDetail />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="audit" element={<Audit />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<p className="adm-state">This page doesn’t exist.</p>} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function Overview() {
  const s = useAdminData(() => adminApi.overview(), [])
  return (
    <section aria-labelledby="adm-overview">
      <AdminHeading id="adm-overview" title="Overview">What needs attention across MyLinnnk today.</AdminHeading>
      <StateView state={s} skeleton="cards">
        {s.data && (
          <div className="adm-cards">
            <div className="adm-card adm-card--teal"><span className="adm-card__label">Users</span><b className="adm-card__value">{s.data.users.total}</b><small>{s.data.users.verified} verified</small></div>
            <div className="adm-card adm-card--navy"><span className="adm-card__label">Drafts</span><b className="adm-card__value">{s.data.drafts}</b><small>Saved in accounts</small></div>
            <div className="adm-card adm-card--purple"><span className="adm-card__label">Live pages</span><b className="adm-card__value">{s.data.publications.active ?? 0}</b><small>{s.data.publications.grace ?? 0} in grace</small></div>
            <div className="adm-card adm-card--accent">
              <span className="adm-card__label">Payments to review</span>
              <b className="adm-card__value">{s.data.awaitingReview}</b>
              <MagneticButton to="/admin/payments" variant="secondary" size="sm" className="adm-card__cta">Open queue</MagneticButton>
            </div>
          </div>
        )}
      </StateView>
    </section>
  )
}

function Users() {
  const { withCsrf } = useAuth()
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState(null)
  const s = useAdminData(() => adminApi.users(search), [search])
  const act = async (fn, done) => {
    setNotice(null)
    try {
      await withCsrf(fn)
      setNotice({ ok: true, text: done })
      s.reload()
    } catch (error) {
      setNotice({ ok: false, text: error.message, code: error.code })
    }
  }
  return (
    <section aria-labelledby="adm-users">
      <AdminHeading id="adm-users" title="Users">Find an account by email and sign it out everywhere if needed.</AdminHeading>
      <form className="adm-filter" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()) }}>
        <label htmlFor="adm-user-q" className="sr-only">Email starts with</label>
        <input id="adm-user-q" placeholder="Email starts with…" value={q} onChange={(e) => setQ(e.target.value)} />
        <MagneticButton type="submit" variant="navy" size="sm">Search</MagneticButton>
      </form>
      <AdminNotice notice={notice} />
      <StateView state={s} empty={s.data?.items.length === 0 && 'No users found.'}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Name</th><th>Email</th><th>Verified</th><th>Role</th><th>Last sign-in</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {s.data?.items.map((u) => (
                <tr key={u.id}>
                  <td>{u.displayName}</td>
                  <td className="adm-wrap">{u.email}</td>
                  <td>{u.emailVerified ? <span className="adm-chip adm-chip--ok">Yes</span> : <span className="adm-chip adm-chip--wait">No</span>}</td>
                  <td>{u.role === 'admin' ? <span className="adm-chip adm-chip--admin">Admin</span> : 'User'}</td>
                  <td>{when(u.lastLoginAt)}</td>
                  <td><button type="button" className="adm-btn adm-btn--sm" onClick={() => act((csrf) => adminApi.revokeSessions(csrf, u.id), 'Signed out everywhere.')} aria-label={`Sign ${u.displayName} out everywhere`}>Sign out everywhere</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateView>
    </section>
  )
}

function Publications() {
  const { withCsrf } = useAuth()
  const [status, setStatus] = useState('')
  const [notice, setNotice] = useState(null)
  const s = useAdminData(() => adminApi.publications(status), [status])
  const suspend = async (p) => {
    const reason = window.prompt(`Why suspend /p/${p.slug}? (visible in the audit log)`)
    if (!reason) return
    try {
      await withCsrf((csrf) => adminApi.suspend(csrf, p.id, reason))
      setNotice({ ok: true, text: `/p/${p.slug} suspended.` })
      s.reload()
    } catch (error) {
      setNotice({ ok: false, text: error.message, code: error.code })
    }
  }
  const restore = async (p) => {
    try {
      await withCsrf((csrf) => adminApi.restore(csrf, p.id))
      setNotice({ ok: true, text: `/p/${p.slug} restored.` })
      s.reload()
    } catch (error) {
      setNotice({ ok: false, text: error.message, code: error.code })
    }
  }
  return (
    <section aria-labelledby="adm-pubs">
      <AdminHeading id="adm-pubs" title="Publications">Every public address, its plan and expiry. Suspending hides a page immediately.</AdminHeading>
      <div className="adm-filter">
        <label htmlFor="adm-pub-status">Status</label>
        <select id="adm-pub-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">all</option>
          {['draft', 'pending_payment', 'pending_review', 'scheduled', 'active', 'grace', 'expired', 'unpublished'].map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <AdminNotice notice={notice} />
      <StateView state={s} empty={s.data?.items.length === 0 && 'No publications.'}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Address</th><th>Status</th><th>Owner</th><th>Plan</th><th>Expires</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {s.data?.items.map((p) => (
                <tr key={p.id}>
                  <td><a href={`/p/${p.slug}`} target="_blank" rel="noopener">/p/{p.slug}</a></td>
                  <td><StatusChip value={p.effectiveStatus} />{p.suspended && <> <StatusChip value="suspended" /></>}</td>
                  <td className="adm-wrap">{p.owner?.email ?? '—'}</td>
                  <td>{p.plan?.planId ?? '—'}</td>
                  <td>{when(p.expiresAt)}</td>
                  <td>
                    {p.suspended
                      ? <button type="button" className="adm-btn adm-btn--sm" onClick={() => restore(p)}>Restore</button>
                      : <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => suspend(p)}>Suspend</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateView>
    </section>
  )
}

function Transactions() {
  const s = useAdminData(() => adminApi.transactions(), [])
  return (
    <section aria-labelledby="adm-tx">
      <AdminHeading id="adm-tx" title="Transactions">Approved payments, each matched to a verified bank credit.</AdminHeading>
      <StateView state={s} empty={s.data?.items.length === 0 && 'No approved payments yet.'}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Reference</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Bank reference</th><th>Approved</th></tr></thead>
            <tbody>
              {s.data?.items.map((o) => (
                <tr key={o.reference}>
                  <td><Link to={`/admin/payments/${o.reference}`}>{o.reference}</Link></td>
                  <td className="adm-wrap">{o.customer?.email}</td>
                  <td>{o.plan.name}</td>
                  <td>{money(o.review?.verifiedAmountMinor ?? o.plan.amountMinor)}</td>
                  <td className="adm-mono">{o.review?.bankTransactionRef}</td>
                  <td>{when(o.review?.decidedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateView>
    </section>
  )
}

function Audit() {
  const [action, setAction] = useState('')
  const [filter, setFilter] = useState('')
  const s = useAdminData(() => adminApi.audit(filter), [filter])
  return (
    <section aria-labelledby="adm-audit">
      <AdminHeading id="adm-audit" title="Audit log">Append-only record of sign-ins, decisions and changes.</AdminHeading>
      <form className="adm-filter" onSubmit={(e) => { e.preventDefault(); setFilter(action.trim()) }}>
        <label htmlFor="adm-audit-action" className="sr-only">Action</label>
        <input id="adm-audit-action" placeholder="e.g. payment.approved" value={action} onChange={(e) => setAction(e.target.value)} />
        <MagneticButton type="submit" variant="navy" size="sm">Filter</MagneticButton>
      </form>
      <StateView state={s} empty={s.data?.items.length === 0 && 'No entries.'}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>When</th><th>Action</th><th>Outcome</th><th>Actor</th><th>Target</th><th>Details</th></tr></thead>
            <tbody>
              {s.data?.items.map((e) => (
                <tr key={e.id}>
                  <td>{when(e.at)}</td>
                  <td className="adm-mono">{e.action}</td>
                  <td><StatusChip value={e.outcome} /></td>
                  <td>{e.actor.type}{e.actor.role ? ` (${e.actor.role})` : ''}</td>
                  <td className="adm-mono adm-wrap">{e.target ? `${e.target.type}:${e.target.id}` : '—'}</td>
                  <td className="adm-mono adm-wrap">{Object.keys(e.meta ?? {}).length ? JSON.stringify(e.meta) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateView>
    </section>
  )
}

function Settings() {
  const s = useAdminData(() => adminApi.settings(), [])
  const d = s.data
  return (
    <section aria-labelledby="adm-settings">
      <AdminHeading id="adm-settings" title="Settings">Read-only. Settings are changed in the server environment (see DEPLOYMENT.md).</AdminHeading>
      <StateView state={s} skeleton="detail">
        {d && (
          <dl className="adm-dl">
            <div><dt>Environment</dt><dd>{d.environment}</dd></div>
            <div><dt>Payments</dt><dd>{d.payments.mode}{d.payments.bank.isTest ? ' · test placeholder bank details' : ''}</dd></div>
            <div><dt>Bank</dt><dd>{d.payments.bank.name} · {d.payments.bank.accountName} · ••••{d.payments.bank.accountNumberLast4}</dd></div>
            <div><dt>Unpaid orders expire after</dt><dd>{d.payments.orderTtlHours} h</dd></div>
            <div><dt>Receipt size limit</dt><dd>{d.payments.receiptMaxMb} MB</dd></div>
            <div><dt>Email</dt><dd>{d.email.transport}</dd></div>
            <div><dt>Image storage</dt><dd>{d.storage.media}</dd></div>
            <div><dt>Admin sign-in lasts</dt><dd>{d.adminSessionMaxHours} h</dd></div>
            <div><dt>Migrations</dt><dd>{Object.entries(d.migrations).map(([k, v]) => `${k}: ${v ? 'applied' : 'pending'}`).join(' · ')}</dd></div>
          </dl>
        )}
      </StateView>
    </section>
  )
}
