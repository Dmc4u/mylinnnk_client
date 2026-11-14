import { useEffect, useId, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { authHref } from '../../auth/redirects.js'
import { useAuth } from '../../auth/useAuth.js'
import usePlans from '../../components/Pricing/usePlans.js'
import { formatAmount, planTerms } from '../../editor/config/plans.js'
import { publishingApi } from '../../services/publishingApi.js'
import '../OrderPage/OrderPage.css'

/**
 * /publish/:pageId — the customer's publishing journey for one cloud draft:
 *   1. choose the page's public address (/p/<address>);
 *   2. choose a paid plan → the server creates a payment order (price from the server) → /orders/:reference.
 * Nothing is published here: only a verified, admin-approved bank transfer does that.
 */
export default function PublishPage() {
  const { pageId } = useParams()
  const { status: authStatus, user, withCsrf } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const plans = usePlans()
  const slugId = useId()
  const [publication, setPublication] = useState({ status: 'loading' })
  const [slugInput, setSlugInput] = useState('')
  const [slugMessage, setSlugMessage] = useState(null)
  const [planId, setPlanId] = useState(null)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authStatus !== 'authenticated') return undefined
    let active = true
    publishingApi.getPublication(pageId).then(
      (data) => active && setPublication({ status: 'ready', value: data.publication }),
      (e) => active && setPublication({ status: 'error', error: e }),
    )
    return () => {
      active = false
    }
  }, [authStatus, pageId])

  if (authStatus === 'loading') return <main className="order-page"><p role="status">Loading…</p></main>
  if (authStatus !== 'authenticated') return <Navigate to={authHref('login', location.pathname)} replace />

  const checkout = plans.data?.checkout
  const paidPlans = (plans.data?.plans ?? []).filter((p) => p.publishing && p.price && p.billing !== 'custom_quote')
  const pub = publication.value
  const addressLocked = pub && !['draft', 'expired', 'unpublished'].includes(pub.status)

  const reserve = async (e) => {
    e.preventDefault()
    setBusy('slug')
    setError(null)
    setSlugMessage(null)
    try {
      const data = await withCsrf((csrf) => publishingApi.reserveSlug(csrf, pageId, slugInput))
      setPublication({ status: 'ready', value: data.publication })
      setSlugMessage({ ok: true, text: `Your page’s address is /p/${data.publication.slug}` })
    } catch (err) {
      setSlugMessage({ ok: false, text: err.message })
    } finally {
      setBusy(null)
    }
  }

  const order = async () => {
    setBusy('order')
    setError(null)
    try {
      const data = await withCsrf((csrf) => publishingApi.createOrder(csrf, pageId, planId))
      navigate(`/orders/${data.order.reference}`)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="order-page">
      <title>Publish your page · MyLinnnk</title>
      <div className="order-card">
        <p className="order-eyebrow">Publish</p>
        <h1>Publish your page</h1>
        <p className="order-muted">Choose the address people will visit, then a plan. You’ll get bank transfer details with a reference.</p>

        {checkout && !checkout.available && (
          <p className="order-notice" role="status">Paid publishing isn’t available yet. You can keep editing your page for free.</p>
        )}
        {checkout?.test && <p className="order-notice order-notice--test">Test mode: payment details are placeholders. Don’t transfer real money.</p>}
        {!user?.emailVerified && (
          <p className="order-notice">Please verify your email address first (see your account page) — it’s needed before paying.</p>
        )}

        <section className="order-section" aria-labelledby={`${slugId}-h`}>
          <h2 id={`${slugId}-h`}>1. Address</h2>
          {publication.status === 'loading' && <p role="status">Loading…</p>}
          {publication.status === 'error' && <p role="alert">{publication.error.message}</p>}
          {publication.status === 'ready' && addressLocked && (
            <p>
              Your page’s address: <strong>/p/{pub.slug}</strong> (fixed while it’s being paid for or published).
            </p>
          )}
          {publication.status === 'ready' && !addressLocked && (
            <form className="order-form order-form--inline" onSubmit={reserve}>
              <label htmlFor={slugId}>mylinnnk.com/p/</label>
              <input id={slugId} value={slugInput} placeholder={pub?.slug ?? 'ada-and-tunde'} onChange={(e) => setSlugInput(e.target.value)} minLength={3} maxLength={60} required />
              <button type="submit" className="order-btn" disabled={busy === 'slug'}>
                {pub ? 'Change address' : 'Save address'}
              </button>
              {pub && <p className="order-muted">Current address: /p/{pub.slug}</p>}
              {slugMessage && <p role={slugMessage.ok ? 'status' : 'alert'} className={slugMessage.ok ? 'order-ok' : 'order-error'}>{slugMessage.text}</p>}
            </form>
          )}
        </section>

        <section className="order-section" aria-labelledby={`${slugId}-plans`}>
          <h2 id={`${slugId}-plans`}>2. Plan</h2>
          {plans.status === 'loading' && <p role="status">Loading prices…</p>}
          {plans.status === 'error' && <p role="alert">We couldn’t load the prices right now.</p>}
          <fieldset className="order-plans" disabled={!checkout?.available}>
            <legend className="sr-only">Choose a plan</legend>
            {paidPlans.map((p) => (
              <label key={p.id} className={`order-plan${planId === p.id ? ' is-selected' : ''}`}>
                <input type="radio" name="plan" value={p.id} checked={planId === p.id} onChange={() => setPlanId(p.id)} />
                <span className="order-plan__name">{p.name}</span>
                <span className="order-plan__price">{formatAmount(p.price.amountMinor, plans.data.currency)}</span>
                <span className="order-plan__terms">{planTerms(p)}</span>
              </label>
            ))}
          </fieldset>
        </section>

        {error && (
          <p className="order-error" role="alert">
            {error.message}
            {error.code === 'ORDER_ALREADY_OPEN' && (
              <>
                {' '}
                <Link to="/account#payments">See your payments</Link>
              </>
            )}
          </p>
        )}
        <div className="order-actions">
          <button type="button" className="order-btn order-btn--primary" onClick={order} disabled={!checkout?.available || !pub || !planId || busy === 'order'}>
            {busy === 'order' ? 'Creating…' : 'Get payment details'}
          </button>
          <Link to="/account" className="order-link">
            Back to my account
          </Link>
        </div>
      </div>
    </main>
  )
}
