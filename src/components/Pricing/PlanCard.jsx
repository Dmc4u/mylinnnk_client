import { useId } from 'react'
import { Link } from 'react-router'
import { CREATE_PAGE_HREF } from '../../utils/navigation.js'
import { formatAmount, planTerms, priceDescription, priceParts } from '../../editor/config/plans.js'

const FAMILY_LABEL = { free: 'Start here', celebration: 'Personal events', professional: 'Professional pages', custom: 'Bespoke' }

export function Check() {
  return (
    <svg className="plan-card__check" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The pointer's position over the card drives a soft highlight (mouse only). */
function trackPointer(e) {
  if (e.pointerType !== 'mouse') return
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
  e.currentTarget.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
}

/**
 * One plan in the deck. Prices, terms and savings all come from the server's
 * plan (GET /plans). Choosing a paid plan only marks it as selected: there is
 * no checkout yet.
 */
export default function PlanCard({ plan, currency, index, tilt, selected, onSelect }) {
  const nameId = useId()
  const { amount, per } = priceParts(plan, currency)
  const paid = plan.billing !== 'free'

  return (
    <li
      className={`plan-card plan-card--${plan.family}${plan.featured ? ' is-featured' : ''}${selected ? ' is-selected' : ''}`}
      style={{ '--i': index, '--tilt': `${tilt}deg` }}
      onPointerMove={trackPointer}
      data-plan={plan.id}
    >
      <article className="plan-card__inner" aria-labelledby={nameId}>
        <div className="plan-card__top">
          <p className="plan-card__family">{FAMILY_LABEL[plan.family] ?? ''}</p>
          {plan.featured && <p className="plan-card__badge">Most popular</p>}
          {selected && (
            <p className="plan-card__chosen">
              <Check /> Selected
            </p>
          )}
        </div>
        <h3 id={nameId} className="plan-card__name">
          {plan.name}
        </h3>
        <p className="plan-card__summary">{plan.summary}</p>

        <p className="plan-card__price">
          <span className="plan-card__amount" aria-hidden="true">
            {amount}
          </span>
          {per && (
            <span className="plan-card__per" aria-hidden="true">
              {per}
            </span>
          )}
          <span className="sr-only">{priceDescription(plan, currency)}</span>
        </p>

        {plan.savings && (
          <p className="plan-card__save">
            <strong>Save {plan.savings.percent}%</strong>
            <span>
              {formatAmount(plan.savings.amountMinor, currency)} less than {plan.savings.periods} monthly payments (
              {formatAmount(plan.savings.regularAmountMinor, currency)})
            </span>
          </p>
        )}

        <ul className="plan-card__features">
          {plan.features.map((f) => (
            <li key={f}>
              <Check /> {f}
            </li>
          ))}
        </ul>
        <p className="plan-card__terms">{planTerms(plan)}</p>

        <div className="plan-card__action">
          {paid ? (
            <button type="button" className="plan-btn" aria-pressed={selected} onClick={() => onSelect(plan.id)}>
              Choose <span className="sr-only">{plan.name}</span> plan
            </button>
          ) : (
            <Link to={CREATE_PAGE_HREF} className="plan-btn plan-btn--quiet">
              Start free
            </Link>
          )}
        </div>
      </article>
    </li>
  )
}
