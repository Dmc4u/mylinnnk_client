import { Link, Navigate, useLocation, useOutletContext } from 'react-router'
import { FormAlert } from '../../components/Form/Form.jsx'
import NotificationList from '../../components/Notifications/NotificationList.jsx'
import VerifyEmailCode from '../../components/VerifyEmailCode/VerifyEmailCode.jsx'
import AccountDrafts from './AccountDrafts.jsx'
import AccountOrders from './AccountOrders.jsx'
import AccountPublications from './AccountPublications.jsx'
import DashboardOverview from './DashboardOverview.jsx'
import DashboardSupport from './DashboardSupport.jsx'
import NotificationSettings from './NotificationSettings.jsx'

/** A view's heading (each view is its own page in the dashboard). */
function ViewHeader({ eyebrow = 'Dashboard', title, children }) {
  return (
    <header className="dash__header">
      <p className="dash__eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p className="dash__lead">{children}</p>}
    </header>
  )
}

function VerifyEmailSection({ user }) {
  if (user.emailVerified) return null
  return (
    <section className="account-section" aria-labelledby="verify-heading">
      <h2 id="verify-heading">Confirm your email</h2>
      <p>Confirming your email lets you recover your account. Enter the 6-digit code from our email, or ask for a new one.</p>
      <VerifyEmailCode />
    </section>
  )
}

/** /dashboard */
export function OverviewView() {
  const { user, data, drafts, welcome, verificationEmailSent } = useOutletContext()
  return (
    <>
      <title>Your dashboard · MyLinnnk</title>
      <ViewHeader title="Your dashboard" />
      {welcome && (
        <FormAlert tone={verificationEmailSent ? 'success' : 'warn'} title={`Welcome to MyLinnnk, ${user.displayName}!`}>
          <p>
            {verificationEmailSent
              ? `We’ve sent a 6-digit code to ${user.email}. Enter it below to confirm your email address.`
              : 'We couldn’t send your verification email just now. You can ask for a new code below.'}
          </p>
        </FormAlert>
      )}
      <VerifyEmailSection user={user} />
      <DashboardOverview user={user} drafts={drafts} data={data} />
    </>
  )
}

/** /dashboard/publications */
export function PublicationsView() {
  const { data } = useOutletContext()
  return (
    <>
      <title>Published pages · MyLinnnk</title>
      <ViewHeader title="Published pages">Your pages with a publishing plan: their address, status, plan and dates.</ViewHeader>
      <AccountPublications data={data} />
    </>
  )
}

/** /dashboard/drafts */
export function DraftsView() {
  const { onDrafts } = useOutletContext()
  return (
    <>
      <title>Drafts · MyLinnnk</title>
      <ViewHeader title="Drafts">Pages saved to your account. Continue editing, publish, or delete ones you no longer need.</ViewHeader>
      <AccountDrafts onDrafts={onDrafts} />
    </>
  )
}

/** /dashboard/payments */
export function PaymentsView() {
  const { data } = useOutletContext()
  return (
    <>
      <title>Payments · MyLinnnk</title>
      <ViewHeader title="Payments">Your payment orders. A confirmed payment and a live page are shown separately: a page can end later, even after its payment was confirmed.</ViewHeader>
      <AccountOrders data={data} />
    </>
  )
}

/** /dashboard/support */
export function SupportView() {
  const { data } = useOutletContext()
  return (
    <>
      <title>Help & support · MyLinnnk</title>
      <ViewHeader title="Help & support" />
      <DashboardSupport data={data} />
    </>
  )
}

/** /dashboard/notifications */
export function NotificationsView() {
  return (
    <>
      <title>Notifications · MyLinnnk</title>
      <ViewHeader title="Notifications">Updates about your account, pages and payments.</ViewHeader>
      <NotificationList />
    </>
  )
}

const formatDate = (iso) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

/** /dashboard/account */
export function AccountView() {
  const { user } = useOutletContext()
  const memberSince = formatDate(user.createdAt)
  const initial = (user.displayName.trim()[0] ?? '?').toUpperCase()
  return (
    <>
      <title>Account · MyLinnnk</title>
      <ViewHeader title="Account" />
      <VerifyEmailSection user={user} />
      <section id="account" className="account-section" aria-labelledby="dash-account-title">
        <h2 id="dash-account-title">Profile</h2>
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
            <dd>{user.emailVerified ? <span className="account-badge account-badge--ok">Confirmed</span> : <span className="account-badge account-badge--pending">Not confirmed yet</span>}</dd>
          </div>
          {memberSince && (
            <div>
              <dt>Member since</dt>
              <dd>{memberSince}</dd>
            </div>
          )}
        </dl>
      </section>
      <NotificationSettings />
      <section className="account-section" aria-labelledby="dash-security-title">
        <h2 id="dash-security-title">Security</h2>
        <p>
          Forgot your password, or want to change it? <Link to="/forgot-password">Reset it by email</Link>. Resetting signs you out on every device.
        </p>
        <p className="dash__lead">To log out, use <b>Log out</b> in the dashboard menu.</p>
      </section>
    </>
  )
}

/** Old #section links on /account → the matching dashboard view. */
const LEGACY_SECTIONS = { '#payments': 'payments', '#published': 'publications', '#drafts': 'drafts', '#support': 'support', '#account': 'account', '#overview': '' }

/** /account (old address, still used by links and bookmarks): the dashboard, keeping any navigation state. */
export function LegacyAccountRedirect() {
  const { hash, state } = useLocation()
  const view = LEGACY_SECTIONS[hash] ?? ''
  return <Navigate to={view ? `/dashboard/${view}` : '/dashboard'} replace state={state} />
}
