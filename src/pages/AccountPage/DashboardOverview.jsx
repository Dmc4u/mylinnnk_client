import { Link } from 'react-router'
import { ORDER_STATUS_LABELS } from '../../services/publishingApi.js'
import { dashboardCounts, renewalReminders, REMINDER_DAYS } from './dashboardData.js'
import { longDate } from './publicationState.js'

const Count = ({ label, value, hint, tone, to }) => (
  <Link to={to} className={`dash-stat${tone ? ` dash-stat--${tone}` : ''}`} aria-label={`${label}: ${value ?? 'not loaded'}`}>
    <span className="dash-stat__label">{label}</span>
    <b className="dash-stat__value">{value ?? '–'}</b>
    {hint && <small>{hint}</small>}
  </Link>
)

/** The latest things that happened, from real records only (orders, publications, drafts), newest first. */
function recentActivity({ orders = [], publications = [], drafts = [] }) {
  const items = [
    ...orders.map((o) => ({ at: o.updatedAt ?? o.createdAt, text: `Payment ${o.reference}: ${ORDER_STATUS_LABELS[o.status] ?? o.status}`, to: `/orders/${o.reference}` })),
    ...publications.filter((p) => p.activatedAt).map((p) => ({ at: p.activatedAt, text: `${p.pageTitle || p.title || `/p/${p.slug}`} was published`, to: '/dashboard/publications' })),
    ...(drafts ?? []).map((d) => ({ at: d.updatedAt, text: `Draft “${d.title || 'Untitled page'}” was saved`, to: `/editor/${d.templateSlug}?page=${d.id}` })),
  ]
  return items
    .filter((i) => i.at)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 6)
}

/**
 * Overview: a welcome, the real counts (each opening its view), renewal reminders with days left, recent
 * activity and quick actions, all from the server's data. A dash means "not loaded".
 */
export default function DashboardOverview({ user, drafts, data }) {
  const loaded = data.phase !== 'loading' && data.publicationsLoaded !== false
  const counts = dashboardCounts({ drafts, publications: loaded ? data.publications : null })
  const reminders = loaded ? renewalReminders(data.publications, data.orders) : []
  const activity = recentActivity({ orders: data.orders, publications: loaded ? data.publications : [], drafts })
  return (
    <section id="overview" className="account-section dash-overview" aria-labelledby="dash-overview-title" aria-busy={data.phase === 'loading'}>
      <h2 id="dash-overview-title" className="dash-welcome">
        Welcome back, {user.displayName}
      </h2>
      <nav className="dash-stats" aria-label="Your pages at a glance">
        <Count label="Saved drafts" value={counts.drafts} to="/dashboard/drafts" />
        <Count label="Published pages" value={counts.published} to="/dashboard/publications" />
        <Count label="Live now" value={counts.live} tone="ok" to="/dashboard/publications" />
        <Count label="Expired or suspended" value={counts.attention} tone={counts.attention ? 'warn' : undefined} to="/dashboard/publications" />
        <Count label="Ending soon" value={counts.expiringSoon} hint={`Within ${REMINDER_DAYS} days`} tone={counts.expiringSoon ? 'warn' : undefined} to="/dashboard/publications" />
      </nav>

      {reminders.length > 0 && (
        <div className="dash-reminders" role="region" aria-label="Renewal reminders">
          <h3>Renewal reminders</h3>
          <ul>
            {reminders.map(({ pub, daysLeft, state, action }) => {
              const title = pub.pageTitle || pub.title || `/p/${pub.slug}`
              return (
                <li key={pub.slug} className={`dash-reminder dash-reminder--${state}`}>
                  <div>
                    <p className="dash-reminder__title">{title}</p>
                    <p className="dash-reminder__when">
                      {state === 'expiring'
                        ? daysLeft === 0
                          ? `Ends today (${longDate(pub.expiresAt)})`
                          : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left · ends ${longDate(pub.expiresAt)}`
                        : `Expired on ${longDate(pub.expiresAt)} · offline until renewed`}
                    </p>
                  </div>
                  {action.canRenew ? (
                    <Link className="btn btn--primary btn--sm" to={`/publish/${pub.pageId}`} aria-label={`Renew ${title}`}>
                      Renew
                    </Link>
                  ) : action.orderRef ? (
                    <Link className="btn btn--ghost btn--sm" to={`/orders/${action.orderRef}`}>
                      Payment in progress
                    </Link>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="dash-overview__grid">
        <div className="dash-panel" role="region" aria-label="Recent activity">
          <h3>Recent activity</h3>
          {activity.length === 0 ? (
            <p className="dash-panel__empty">Nothing yet. Choose a template to create your first page.</p>
          ) : (
            <ul className="dash-activity">
              {activity.map((a) => (
                <li key={`${a.to}-${a.at}-${a.text}`}>
                  <Link to={a.to}>{a.text}</Link>
                  <small>{longDate(a.at)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="dash-panel" role="region" aria-label="Quick actions">
          <h3>Quick actions</h3>
          <div className="dash-quick">
            <Link className="btn btn--ghost btn--sm" to="/templates">
              Create a new page
            </Link>
            <Link className="btn btn--ghost btn--sm" to="/dashboard/drafts">
              Continue a draft
            </Link>
            <Link className="btn btn--ghost btn--sm" to="/dashboard/payments">
              Check payments
            </Link>
            <Link className="btn btn--ghost btn--sm" to="/dashboard/support">
              Get help
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
