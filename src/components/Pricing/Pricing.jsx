import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth.js'
import { CREATE_PAGE_HREF } from '../../utils/navigation.js'
import { planTerms, priceParts } from '../../editor/config/plans.js'
import PlanCard, { Check } from './PlanCard.jsx'
import usePlans from './usePlans.js'
import './Pricing.css'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const narrow = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 719px)').matches

/** Gentle fan: at most ±2.4° at the ends so prices stay easy to read; the featured card stays upright. */
const MAX_TILT = 2.4
const tiltFor = (index, count, featured) => (featured || count < 2 ? 0 : Math.round(((index - (count - 1) / 2) / ((count - 1) / 2)) * MAX_TILT * 10) / 10)

/**
 * The plan deck: five fixed-price plans as a slightly overlapping fan of cards
 * (desktop), a wrapped grid (tablet) or a swipeable row (phone), plus Special
 * Request as its own custom-quote card. Prices come from GET /plans only.
 *
 * Stage 1: choosing a plan only selects it. Nothing is bought, no order is
 * created and nothing is published; the notice below says so.
 *
 * Props: selected (plan id | null), onSelect(planId).
 */
export default function Pricing({ selected = null, onSelect }) {
  const { status, data, error, retry } = usePlans()
  const deckRef = useRef(null)
  const noticeId = useId()
  const { user } = useAuth()

  const plans = data?.plans ?? []
  const fixed = plans.filter((p) => p.billing !== 'custom_quote')
  const custom = plans.find((p) => p.billing === 'custom_quote')
  const chosen = plans.find((p) => p.id === selected && p.billing !== 'free') ?? null

  // Deal the cards in when the deck scrolls into view (immediately without motion or IntersectionObserver).
  useEffect(() => {
    const deck = deckRef.current
    if (status !== 'ready' || !deck) return undefined
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      deck.classList.add('is-in')
      return undefined
    }
    const show = () => {
      deck.classList.add('is-in')
      observer.disconnect()
      clearTimeout(safety)
    }
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && show(), { threshold: 0.2 })
    observer.observe(deck)
    // Safety net: the prices must never stay hidden.
    const safety = setTimeout(show, 2500)
    return () => {
      observer.disconnect()
      clearTimeout(safety)
    }
  }, [status])

  // On phones the deck is a swipeable row: start with the featured plan centred.
  useEffect(() => {
    const deck = deckRef.current
    if (status !== 'ready' || !deck || !narrow()) return
    const featured = deck.querySelector('.is-featured')
    if (featured) deck.scrollLeft = featured.offsetLeft - (deck.clientWidth - featured.clientWidth) / 2
  }, [status])

  if (status === 'loading') {
    return (
      <div className="pricing" aria-busy="true">
        <p className="pricing-state" role="status">
          Loading prices…
        </p>
        <ul className="plan-deck plan-deck--skeleton" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="plan-card plan-card--skeleton" style={{ '--i': i, '--tilt': '0deg' }} />
          ))}
        </ul>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="pricing">
        <div className="pricing-state pricing-state--error" role="alert">
          <p>
            <strong>We couldn’t load the prices right now.</strong> {error?.message}
          </p>
          <button type="button" className="plan-btn plan-btn--inline" onClick={retry}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  const select = (id) => onSelect?.(id)

  return (
    <div className="pricing">
      {data.checkout?.available === false && (
        <p className="pricing-soon">
          <span className="pricing-soon__dot" aria-hidden="true" /> Paid publishing is coming soon. You can compare plans now;
          nothing can be bought yet.
        </p>
      )}

      <ul ref={deckRef} className="plan-deck" aria-label="Publishing plans" aria-describedby={noticeId}>
        {fixed.map((plan, i) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currency={data.currency}
            index={i}
            tilt={tiltFor(i, fixed.length, plan.featured)}
            selected={selected === plan.id}
            onSelect={select}
          />
        ))}
      </ul>
      <p className="plan-deck__hint" aria-hidden="true">
        Swipe to compare plans
      </p>

      {custom && (
        <section className={`plan-custom${selected === custom.id ? ' is-selected' : ''}`} aria-labelledby={`${noticeId}-custom`}>
          <div className="plan-custom__text">
            <p className="plan-card__family">Bespoke</p>
            <h3 id={`${noticeId}-custom`} className="plan-custom__name">
              {custom.name}
            </h3>
            <p className="plan-custom__summary">{custom.summary}</p>
            <ul className="plan-custom__features">
              {custom.features.map((f) => (
                <li key={f}>
                  <Check /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="plan-custom__side">
            <p className="plan-custom__price">{priceParts(custom, data.currency).amount}</p>
            <p className="plan-card__terms">{planTerms(custom)}</p>
            <button type="button" className="plan-btn plan-btn--outline" aria-pressed={selected === custom.id} onClick={() => select(custom.id)}>
              Request a quote
            </button>
          </div>
        </section>
      )}

      <div id={noticeId} className={`pricing-notice${chosen ? ' is-visible' : ''}`} role="status" aria-live="polite">
        {chosen && (
          <>
            <p className="pricing-notice__title">
              <Check /> {chosen.name} selected
              {chosen.price && (
                <span>
                  {' '}
                  · {priceParts(chosen, data.currency).amount} {priceParts(chosen, data.currency).per}
                </span>
              )}
            </p>
            <p>
              {chosen.billing === 'custom_quote'
                ? 'Custom quotes open soon. Nothing has been requested or charged.'
                : 'Paid publishing is coming soon, so nothing is charged and no page is published yet.'}{' '}
              You can build and save your page for free in the meantime.
            </p>
            <div className="pricing-notice__actions">
              <Link to={CREATE_PAGE_HREF} className="plan-btn plan-btn--inline">
                Start with a template
              </Link>
              {user && (
                <Link to="/account" className="plan-btn plan-btn--inline plan-btn--outline">
                  Go to my drafts
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
