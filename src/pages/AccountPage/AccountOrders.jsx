import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatAmount } from '../../editor/config/plans.js'
import { ORDER_STATUS_LABELS, publishingApi } from '../../services/publishingApi.js'

const NGN = { code: 'NGN', minorUnit: 100 }

/** "Payments" on the account page: the user's publishing orders, newest first (hidden when there are none). */
export default function AccountOrders() {
  const [state, setState] = useState({ status: 'loading', orders: [] })

  useEffect(() => {
    let active = true
    publishingApi.listOrders().then(
      (data) => active && setState({ status: 'ready', orders: data.orders }),
      () => active && setState({ status: 'error', orders: [] }),
    )
    return () => {
      active = false
    }
  }, [])

  if (state.status !== 'ready' || state.orders.length === 0) return null
  return (
    <section id="payments" className="account-section" aria-labelledby="account-payments-title">
      <h2 id="account-payments-title">Payments</h2>
      <ul className="account-orders">
        {state.orders.map((o) => (
          <li key={o.reference}>
            <Link to={`/orders/${o.reference}`}>{o.reference}</Link>
            <span>{o.plan.name} · {formatAmount(o.plan.amountMinor, NGN)}</span>
            <span className="account-orders__status">{ORDER_STATUS_LABELS[o.status]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
