import { useCallback, useEffect, useId, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import { authHref } from '../../auth/redirects.js'
import { useAuth } from '../../auth/useAuth.js'
import { formatAmount } from '../../editor/config/plans.js'
import { ORDER_STATUS_LABELS, RECEIPT_ACCEPT, RELOAD_ORDER_CODES, localToday, publishingApi } from '../../services/publishingApi.js'
import './OrderPage.css'

const NGN = { code: 'NGN', minorUnit: 100 }

/**
 * /orders/:reference — one payment order: the bank details and reference to pay with, "I have paid"
 * (what the customer tells us), receipts (evidence) and the review status. Nothing here can mark a
 * payment as received: an administrator checks the actual bank credit.
 */
export default function OrderPage() {
  const { reference } = useParams()
  const { status: authStatus, withCsrf } = useAuth()
  const location = useLocation()
  const ids = useId()
  const [state, setState] = useState({ status: 'loading' })
  const [form, setForm] = useState({ payerName: '', transferDate: localToday(), note: '' })
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  const load = useCallback(() => {
    publishingApi.getOrder(reference).then(
      (data) => setState({ status: 'ready', order: data.order }),
      (error) => setState({ status: error.status === 404 ? 'not_found' : 'error', error }),
    )
  }, [reference])

  useEffect(() => {
    if (authStatus === 'authenticated') load()
  }, [authStatus, load])

  if (authStatus === 'loading') return <main className="order-page"><p role="status">Loading…</p></main>
  if (authStatus !== 'authenticated') return <Navigate to={authHref('login', location.pathname)} replace />
  if (state.status === 'loading') return <main className="order-page"><p role="status">Loading your order…</p></main>
  if (state.status === 'not_found') {
    return (
      <main className="order-page">
        <div className="order-card"><h1>Order not found</h1><Link to="/account" className="order-link">Back to my account</Link></div>
      </main>
    )
  }
  if (state.status === 'error') {
    return (
      <main className="order-page">
        <div className="order-card" role="alert"><h1>We couldn’t load this order</h1><p>{state.error.message}</p><button type="button" className="order-btn" onClick={load}>Try again</button></div>
      </main>
    )
  }

  const { order } = state
  const ins = order.instructions
  // While payments are paused (or were reconfigured since this order was made) nothing can be paid or evidenced; cancelling still works.
  const paused = Boolean(order.paymentsPaused)
  const canReport = !paused && ['awaiting_transfer', 'rejected'].includes(order.status)
  const canAddReceipt = !paused && ['awaiting_transfer', 'submitted', 'rejected'].includes(order.status) && order.receipts.length < 3
  const canCancel = ['awaiting_transfer', 'rejected'].includes(order.status)

  const run = async (key, fn, done) => {
    setBusy(key)
    setMessage(null)
    try {
      const data = await withCsrf(fn)
      setState({ status: 'ready', order: data.order })
      if (done) setMessage({ ok: true, text: done })
    } catch (error) {
      setMessage({ ok: false, text: error.message })
      // e.g. the payment deadline passed: show the order as it is now (expired), not a form that can't work.
      if (RELOAD_ORDER_CODES.includes(error.code)) load()
    } finally {
      setBusy(null)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    run('submit', (csrf) => publishingApi.submitPayment(csrf, reference, { ...form, payerName: form.payerName.trim() }), 'Thanks! We’ll check our bank account for your transfer.')
  }
  const upload = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) run('receipt', (csrf) => publishingApi.uploadReceipt(csrf, reference, file), 'Receipt added.')
  }

  return (
    <main className="order-page">
      <title>{`Order ${order.reference} · MyLinnnk`}</title>
      <div className="order-card">
        <p className="order-eyebrow">Payment order</p>
        <h1>{order.reference}</h1>
        <p className={`order-status order-status--${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</p>
        <p className="order-muted">{order.message}</p>
        {order.rejectionReason && <p className="order-error">Reason: {order.rejectionReason}</p>}

        <dl className="order-facts">
          <div><dt>Plan</dt><dd>{order.plan.name} · {order.plan.validityDays} days{order.kind === 'renewal' ? ' (renewal)' : ''}</dd></div>
          <div><dt>Amount</dt><dd>{formatAmount(order.plan.amountMinor, NGN)}</dd></div>
          {order.expiresAt && <div><dt>Pay by</dt><dd>{new Date(order.expiresAt).toLocaleString()}</dd></div>}
        </dl>

        {paused && ['awaiting_transfer', 'submitted', 'under_review', 'rejected'].includes(order.status) && (
          <p className="order-notice" role="note">Payments are paused for this order, so bank details aren’t shown and nothing can be paid or uploaded. Don’t transfer money for it. You can cancel it, or contact support with your reference.</p>
        )}

        {ins && (
          <section className={`order-bank${ins.isTest ? ' order-bank--test' : ''}`} aria-labelledby={`${ids}-bank`}>
            {ins.isTest && <p className="order-notice order-notice--test" role="note">TEST MODE: these are not real bank details. Do not transfer money.</p>}
            <h2 id={`${ids}-bank`}>Bank transfer details</h2>
            <dl className="order-facts">
              <div><dt>Bank</dt><dd>{ins.bankName}</dd></div>
              <div><dt>Account name</dt><dd>{ins.accountName}</dd></div>
              <div><dt>Account number</dt><dd className="order-mono">{ins.accountNumber}</dd></div>
              <div><dt>Exact amount</dt><dd>{formatAmount(ins.amountMinor, NGN)}</dd></div>
              <div><dt>Reference (narration)</dt><dd className="order-mono">{ins.reference}</dd></div>
            </dl>
            <ol className="order-steps">{ins.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </section>
        )}

        {canReport && (
          <form className="order-form" onSubmit={submit} aria-labelledby={`${ids}-paid`}>
            <h2 id={`${ids}-paid`}>I have paid</h2>
            <label htmlFor={`${ids}-name`}>Name on the paying account</label>
            <input id={`${ids}-name`} value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })} minLength={2} maxLength={100} required />
            <label htmlFor={`${ids}-date`}>Transfer date</label>
            <input id={`${ids}-date`} type="date" value={form.transferDate} max={localToday()} onChange={(e) => setForm({ ...form, transferDate: e.target.value })} aria-describedby={`${ids}-date-hint`} required />
            <p id={`${ids}-date-hint`} className="order-muted">The day your bank shows for the transfer.</p>
            <label htmlFor={`${ids}-note`}>Note (optional)</label>
            <textarea id={`${ids}-note`} value={form.note} maxLength={500} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <button type="submit" className="order-btn order-btn--primary" disabled={busy === 'submit'}>{busy === 'submit' ? 'Sending…' : 'I have paid'}</button>
            <p className="order-muted">Telling us you paid doesn’t publish your page by itself: we first confirm the money arrived.</p>
          </form>
        )}

        <section className="order-section" aria-labelledby={`${ids}-receipts`}>
          <h2 id={`${ids}-receipts`}>Receipts</h2>
          {order.receipts.length === 0 && <p className="order-muted" id={`${ids}-receipt-hint`}>No receipts yet. A screenshot or photo of your transfer (JPEG, PNG or WebP) helps us find it faster.</p>}
          <ul className="order-receipts">
            {order.receipts.map((r) => (
              <li key={r.receiptId}>
                <a href={publishingApi.receiptUrl(order.reference, r.receiptId)} target="_blank" rel="noopener">Image · {Math.max(1, Math.round(r.bytes / 1024))} KB</a>
              </li>
            ))}
          </ul>
          {canAddReceipt && (
            <label className="order-btn order-upload">
              {busy === 'receipt' ? 'Uploading…' : 'Add a receipt'}
              <input type="file" accept={RECEIPT_ACCEPT} onChange={upload} disabled={busy === 'receipt'} className="sr-only" aria-describedby={order.receipts.length === 0 ? `${ids}-receipt-hint` : undefined} />
            </label>
          )}
        </section>

        {message && <p className={message.ok ? 'order-ok' : 'order-error'} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}

        <div className="order-actions">
          {canCancel && (
            <button type="button" className="order-btn" onClick={() => run('cancel', (csrf) => publishingApi.cancelOrder(csrf, reference), 'Order cancelled.')} disabled={busy === 'cancel'}>
              Cancel order
            </button>
          )}
          <button type="button" className="order-btn" onClick={load}>Refresh status</button>
          <Link to="/account" className="order-link">Back to my account</Link>
        </div>
      </div>
    </main>
  )
}
