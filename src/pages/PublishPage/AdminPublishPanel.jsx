import { useId, useState } from 'react'
import { adminApi } from '../../admin/adminApi.js'

const EXPIRY_CHOICES = [
  { value: 'none', label: 'No end date' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '365 days' },
]
const toExpiry = (value) => (value === 'none' ? { mode: 'none' } : { mode: 'days', days: Number(value) })
const ERRORS = {
  ADMIN_REAUTH_REQUIRED: 'For security, sign out and sign in again, then try once more.',
}

/**
 * Administrator only (shown when the server says this session is the designated admin; the server checks
 * again on every request and only ever finds the admin's own pages): publish this page without payment,
 * replace its published content with the latest saved draft, or extend it. Customers never see this.
 */
export default function AdminPublishPanel({ pageId, publication, withCsrf, onChange }) {
  const id = useId()
  const [expiry, setExpiry] = useState('none')
  const [credit, setCredit] = useState(true)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  if (!publication) {
    return (
      <section className="order-section order-admin" aria-labelledby={`${id}-h`}>
        <h2 id={`${id}-h`}>Administrator</h2>
        <p className="order-muted">Save an address first. You can then publish this page free of charge.</p>
      </section>
    )
  }
  const status = publication.effectiveStatus ?? publication.status
  const paying = ['pending_payment', 'pending_review'].includes(status)
  const live = ['scheduled', 'active', 'grace'].includes(publication.status)
  const canPublish = ['draft', 'expired', 'unpublished'].includes(publication.status) && !paying
  const canExtend = ['active', 'grace', 'expired'].includes(status) && Boolean(publication.activatedAt)

  const run = async (kind, call, done) => {
    setBusy(kind)
    setMessage(null)
    try {
      const data = await withCsrf(call)
      onChange(data.publication)
      setMessage({ ok: true, text: done(data.publication) })
      setConfirmPublish(false)
      setTyped('')
    } catch (err) {
      setMessage({ ok: false, text: ERRORS[err.code] ?? err.message })
    } finally {
      setBusy(null)
    }
  }
  const endText = (pub) => (pub.expiresAt ? `until ${new Date(pub.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}` : 'with no end date')

  return (
    <section className="order-section order-admin" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>Administrator: publish without payment</h2>
      <p className="order-muted">Only for your own pages. Each action is recorded in the audit log. Customers always pay as usual.</p>

      {(canPublish || canExtend) && (
        <div className="order-form">
          <label htmlFor={`${id}-expiry`}>How long it stays live</label>
          <select id={`${id}-expiry`} value={expiry} onChange={(e) => setExpiry(e.target.value)}>
            {EXPIRY_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {paying && <p className="order-notice">This page has a payment order in progress. Cancel it first to publish it free of charge.</p>}

      {canPublish && (
        <div className="order-form">
          <label className="order-check">
            <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} /> Show the small “Created with MyLinnnk” credit
          </label>
          {!confirmPublish ? (
            <button type="button" className="order-btn order-btn--primary" onClick={() => setConfirmPublish(true)}>
              Publish free of charge
            </button>
          ) : (
            <div role="group" aria-label="Confirm publishing">
              <p>
                Publish your latest saved draft at <strong>/p/{publication.slug}</strong> now, free of charge?
              </p>
              <button
                type="button"
                className="order-btn order-btn--primary"
                disabled={busy === 'publish'}
                onClick={() => run('publish', (csrf) => adminApi.publishOwn(csrf, pageId, toExpiry(expiry), credit), (p) => `Published at /p/${p.slug}, ${endText(p)}.`)}
              >
                {busy === 'publish' ? 'Publishing…' : 'Yes, publish now'}
              </button>{' '}
              <button type="button" className="order-btn" onClick={() => setConfirmPublish(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {canExtend && (
        <div className="order-form">
          <button
            type="button"
            className="order-btn"
            disabled={busy === 'extend'}
            onClick={() => run('extend', (csrf) => adminApi.extendOwn(csrf, pageId, toExpiry(expiry)), (p) => `Extended: live ${endText(p)}.`)}
          >
            {busy === 'extend' ? 'Extending…' : status === 'expired' ? 'Renew free of charge' : 'Extend free of charge'}
          </button>
        </div>
      )}

      {live && (
        <form
          className="order-form"
          onSubmit={(e) => {
            e.preventDefault()
            run('update', (csrf) => adminApi.updateOwnContent(csrf, pageId, typed.trim()), (p) => `The page at /p/${p.slug} now shows your latest saved draft.`)
          }}
        >
          <p>
            <strong>Replace the published content</strong> of /p/{publication.slug} with your latest saved draft. Visitors will see the new content at once.
          </p>
          <label htmlFor={`${id}-confirm`}>Type the address ({publication.slug}) to confirm</label>
          <input id={`${id}-confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          <button type="submit" className="order-btn" disabled={busy === 'update' || typed.trim().toLowerCase() !== publication.slug}>
            {busy === 'update' ? 'Updating…' : 'Replace published content'}
          </button>
        </form>
      )}

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'order-ok' : 'order-error'}>
          {message.text}
        </p>
      )}
    </section>
  )
}
