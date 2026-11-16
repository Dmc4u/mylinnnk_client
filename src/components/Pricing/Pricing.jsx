import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth.js'
import { CREATE_PAGE_HREF } from '../../utils/navigation.js'
import { quoteRequestHref } from '../../utils/contact.js'
import { planTerms, priceParts } from '../../editor/config/plans.js'
import PlanCard, { Check } from './PlanCard.jsx'
import PriceCountry from './PriceCountry.jsx'
import { displayPrice, usePriceCountry } from './priceDisplay.js'
import { displayCurrencyFor } from '../../config/countryCurrency.js'
import useAutoCycle from './useAutoCycle.js'
import usePlans from './usePlans.js'
import './Pricing.css'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Signed distance of card `i` from the front card, wrapping so the fan stays balanced (…, -2, -1, 0, 1, 2, …). */
function offsetFrom(i, front, count) {
  let d = (((i - front) % count) + count) % count
  if (d > Math.floor(count / 2)) d -= count
  return d
}

/** "Professional Monthly" → "Monthly", "Free Editor" → "Free" (the selector chips). */
const shortName = (plan) => plan.name.replace(/^Professional /, '').replace(/ Editor$/, '')

/**
 * The plan stack: the five fixed-price plans as an overlapping, fanned stack of
 * cards with one card in front (Professional Monthly to begin with, or the plan
 * in ?plan=). Special Request is its own custom-quote card below.
 *
 * - Click or tap a card behind, or press its button with the keyboard: it comes
 *   to the front and becomes the selected plan.
 * - Previous / next, the plan selectors, ← / → keys and swiping only bring a
 *   card to the front, so you can browse without choosing.
 * - "Choose plan" on the front card selects it.
 * - The stack also turns by itself every few seconds (useAutoCycle): it pauses
 *   while it is pointed at, pressed, focused from the keyboard, off screen or in
 *   a hidden tab, and has a Pause / Play button. It only changes the front card,
 *   never the selection, and is quiet for screen readers.
 *
 * Prices come from GET /plans only. Stage 1: selecting a plan buys nothing.
 * Props: selected (plan id | null), onSelect(planId).
 */
export default function Pricing({ selected = null, onSelect }) {
  const [priceCountry, setPriceCountry, { detected: countryDetected }] = usePriceCountry()
  // Estimates in the chosen country's currency (USD when none is chosen); prices to pay stay NGN.
  const { status, data, error, retry } = usePlans({ display: displayCurrencyFor(priceCountry) })
  const deckRef = useRef(null)
  const stackRef = useRef(null)
  const swipe = useRef(null)
  const noticeId = useId()
  const { user } = useAuth()
  const [browsing, setBrowsing] = useState(null)
  // Position changes made by a person are announced; automatic ones are not.
  const [announce, setAnnounce] = useState(true)

  const plans = data?.plans ?? []
  const fixed = plans.filter((p) => p.billing !== 'custom_quote')
  const custom = plans.find((p) => p.billing === 'custom_quote')
  const chosen = plans.find((p) => p.id === selected && p.billing !== 'free') ?? null

  const indexOf = (id) => fixed.findIndex((p) => p.id === id)
  const featured = Math.max(0, fixed.findIndex((p) => p.featured))
  const front = [browsing, selected].map(indexOf).find((i) => i >= 0) ?? featured
  const frontPlan = fixed[front]

  const cycle = useAutoCycle({
    ready: status === 'ready' && fixed.length > 1,
    rootRef: stackRef,
    frontKey: front,
    onAdvance: () => {
      setAnnounce(false)
      setBrowsing(fixed[(front + 1) % fixed.length].id)
    },
  })

  // Deal the cards in when the stack scrolls into view (at once without motion or IntersectionObserver).
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
    const safety = setTimeout(show, 2500) // the prices must never stay hidden
    return () => {
      observer.disconnect()
      clearTimeout(safety)
    }
  }, [status])

  if (status === 'loading') {
    return (
      <div className="pricing" aria-busy="true">
        <p className="pricing-state" role="status">
          Loading prices…
        </p>
        <div className="plan-stack plan-stack--skeleton" aria-hidden="true">
          <div className="plan-card--skeleton" />
        </div>
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

  const browse = (index) => {
    setAnnounce(true)
    setBrowsing(fixed[((index % fixed.length) + fixed.length) % fixed.length].id)
  }
  const select = (id) => {
    setAnnounce(true)
    setBrowsing(null)
    onSelect?.(id)
  }

  const onKeyDown = (e) => {
    if (e.target.closest('.plan-card.is-front')) return // let the front card's own controls work normally
    const moves = { ArrowLeft: front - 1, ArrowRight: front + 1, Home: 0, End: fixed.length - 1 }
    if (!(e.key in moves)) return
    e.preventDefault()
    browse(moves[e.key])
  }

  // Swipe left / right on touch screens (vertical scrolling is left to the browser).
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e) => {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - start.y)) browse(front + (dx < 0 ? 1 : -1))
  }

  const chosenPrice = chosen?.price ? displayPrice(chosen, data, priceCountry) : null
  // The rate provider's terms ask for attribution wherever its rates are used: shown only while
  // US-dollar estimates from it are on screen (never for NGN prices or a manual rate).
  const providerAttribution = data.estimate?.source === 'exchangerate-api' && fixed.some((p) => displayPrice(p, data, priceCountry).mode === 'estimate')

  return (
    <div className="pricing">
      {data.checkout?.available === false && (
        <p className="pricing-soon">
          <span className="pricing-soon__dot" aria-hidden="true" /> Paid publishing is coming soon. You can compare plans now;
          nothing can be bought yet.
        </p>
      )}

      <PriceCountry country={priceCountry} onChange={setPriceCountry} detected={countryDetected} />

      <div
        ref={stackRef}
        className="plan-stack"
        onKeyDown={onKeyDown}
        onPointerEnter={cycle.handlers.onPointerEnter}
        onPointerLeave={cycle.handlers.onPointerLeave}
        onPointerDown={(e) => {
          cycle.handlers.onPointerDown(e)
          onPointerDown(e)
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
        onFocus={cycle.handlers.onFocus}
        onBlur={cycle.handlers.onBlur}
      >
        <ul ref={deckRef} className="plan-deck" aria-label="Publishing plans" aria-describedby={noticeId}>
          {fixed.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currency={data.currency}
              display={displayPrice(plan, data, priceCountry)}
              index={i}
              offset={offsetFrom(i, front, fixed.length)}
              selected={selected === plan.id}
              onSelect={select}
              onPeek={select}
            />
          ))}
        </ul>

        <div className="plan-stack__controls">
          <button type="button" className="plan-stack__arrow" aria-label="Previous plan" onClick={() => browse(front - 1)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="plan-stack__chips" role="group" aria-label="Show a plan">
            {fixed.map((plan, i) => (
              <button
                key={plan.id}
                type="button"
                className="plan-stack__chip"
                aria-current={i === front ? 'true' : undefined}
                aria-label={`Show ${plan.name}`}
                onClick={() => browse(i)}
              >
                <span className="plan-stack__chip-label" aria-hidden="true">
                  {shortName(plan)}
                </span>
              </button>
            ))}
          </div>
          <button type="button" className="plan-stack__arrow" aria-label="Next plan" onClick={() => browse(front + 1)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="plan-stack__status">
          <p className="plan-stack__position" aria-live={announce ? 'polite' : 'off'}>
            <span className="sr-only">Showing </span>
            {frontPlan?.name} · {front + 1} of {fixed.length}
          </p>
          <button
            type="button"
            className="plan-stack__play"
            aria-label={cycle.stopped ? 'Play automatic plan rotation' : 'Pause automatic plan rotation'}
            onClick={cycle.toggleStopped}
          >
            {cycle.stopped ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor" />
              </svg>
            )}
            <span aria-hidden="true">{cycle.stopped ? 'Play' : 'Pause'}</span>
          </button>
        </div>
      </div>

      {providerAttribution && (
        <p className="price-attribution">
          <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
            Rates By Exchange Rate API
          </a>
        </p>
      )}

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
                  · {chosenPrice.amount} {chosenPrice.per}
                  {chosenPrice.mode === 'estimate' && ` (estimate; you pay ${chosenPrice.payable} in NGN)`}
                </span>
              )}
            </p>
            <p>
              {chosen.billing === 'custom_quote'
                ? 'Tell us what you have in mind and we’ll reply with a quote. Nothing is charged until you agree.'
                : data.checkout?.available
                  ? 'To publish with this plan, build your page, save it to your account, then choose Publish. You pay by bank transfer, and your page goes live once we confirm the payment.'
                  : 'Paid publishing is coming soon, so nothing is charged and no page is published yet. You can build and save your page for free in the meantime.'}
            </p>
            <div className="pricing-notice__actions">
              {chosen.billing === 'custom_quote' ? (
                <Link to={quoteRequestHref({ planId: chosen.id })} className="plan-btn plan-btn--inline">
                  Request a quote
                </Link>
              ) : (
                <Link to={CREATE_PAGE_HREF} className="plan-btn plan-btn--inline">
                  Start with a template
                </Link>
              )}
              {user && (
                <Link to="/dashboard/drafts" className="plan-btn plan-btn--inline plan-btn--outline">
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
