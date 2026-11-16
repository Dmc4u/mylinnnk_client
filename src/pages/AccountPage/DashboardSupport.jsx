import { Link } from 'react-router'
import { CONTACT_PATH, QUOTE_PATH } from '../../utils/contact.js'
import { OPEN_ORDER_STATES } from './dashboardData.js'

const FAQ = [
  ['How do I publish a page?', 'Open a draft, choose Publish, pick an address and a plan, then pay by bank transfer. Your page goes live once we confirm the payment.'],
  ['How long does payment checking take?', 'We check our bank account for your transfer, usually within one working day. Upload your receipt and press “I have paid” to help us find it.'],
  ['What happens when my plan ends?', 'The page goes offline at its address, but your draft stays in your account. Renew it from this dashboard to bring it back.'],
  ['Can I change my page after publishing?', 'Yes. Edit the draft and publish again when you’re ready. The address stays the same.'],
]

/**
 * Support: Contact and Request a Quote, a short FAQ, and a one-click way to ask about the payment in
 * progress (its reference goes with the message).
 */
export default function DashboardSupport({ data }) {
  const openOrder = (data.orders ?? []).find((o) => OPEN_ORDER_STATES.includes(o.status))
  return (
    <section id="support" className="account-section dash-support" aria-labelledby="dash-support-title">
      <h2 id="dash-support-title">Help & support</h2>
      <div className="dash-support__actions">
        <Link className="btn btn--ghost btn--sm" to={CONTACT_PATH}>
          Contact support
        </Link>
        <Link className="btn btn--ghost btn--sm" to={QUOTE_PATH}>
          Request a quote
        </Link>
        {openOrder && (
          <Link className="btn btn--ghost btn--sm" to={`${CONTACT_PATH}?topic=payments&ref=${encodeURIComponent(openOrder.reference)}`}>
            Ask about payment {openOrder.reference}
          </Link>
        )}
      </div>
      <div className="dash-faq">
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
