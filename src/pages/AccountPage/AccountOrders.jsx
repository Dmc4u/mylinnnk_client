import { Link } from 'react-router'
import { formatAmount } from '../../editor/config/plans.js'
import { ORDER_STATUS_LABELS } from '../../services/publishingApi.js'
import { OPEN_ORDER_STATES } from './dashboardData.js'
import { longDate, publicationState } from './publicationState.js'

const NGN = { code: 'NGN', minorUnit: 100 }

/**
 * "Payments & orders": the account's orders (from GET /orders, newest first) with their reference,
 * plan, amount, status, and the page each one is for. Nothing is stored or computed here.
 */
export default function AccountOrders({ data }) {
  const { phase, orders = [], publications = [] } = data
  const pageFor = (order) => publications.find((p) => p.pageId === order.pageId)
  return (
    <section id="payments" className="account-section" aria-labelledby="account-payments-title" aria-busy={phase === 'loading'}>
      <h2 id="account-payments-title">Payments</h2>
      {phase === 'error' && data.ordersLoaded === false && <p className="account-published__error" role="alert">Your payments couldn’t be loaded.</p>}
      {phase !== 'loading' && data.ordersLoaded !== false && orders.length === 0 && <p className="account-drafts__empty">No payments yet.</p>}
      {orders.length > 0 && (
        <ul className="account-orders">
          {orders.map((o) => {
            const page = pageFor(o)
            const open = OPEN_ORDER_STATES.includes(o.status)
            return (
              <li key={o.reference} className={open ? 'is-open' : undefined}>
                <div className="account-orders__main">
                  <Link to={`/orders/${o.reference}`} className="account-orders__ref" aria-label={`Payment ${o.reference}`}>
                    {o.reference}
                  </Link>
                  <span>
                    {o.plan.name}
                    {o.kind === 'renewal' ? ' (renewal)' : ''} · {formatAmount(o.plan.amountMinor, NGN)}
                  </span>
                  <small>{longDate(o.createdAt)}</small>
                </div>
                <div className="account-orders__side">
                  <span className="account-orders__status">
                    <span className="account-orders__kind">Payment:</span> {ORDER_STATUS_LABELS[o.status]}
                  </span>
                  {page && (
                    <span className="account-orders__status account-orders__status--page">
                      <span className="account-orders__kind">Page:</span> {publicationState(page).label}
                    </span>
                  )}
                  {page?.publiclyVisible && page.url ? (
                    <a href={page.url} target="_blank" rel="noopener noreferrer" className="account-orders__page">
                      /p/{page.slug}
                    </a>
                  ) : page ? (
                    <span className="account-orders__page">/p/{page.slug}</span>
                  ) : null}
                  <Link to={`/orders/${o.reference}`} className="account-orders__view">
                    View details
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
