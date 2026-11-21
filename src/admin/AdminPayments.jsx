import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import MagneticButton from '../components/UI/MagneticButton.jsx'
import { AdminNotice } from './ReauthPrompt.jsx'
import StateView, { AdminHeading, StatusChip } from './StateView.jsx'
import { adminApi, day, money, useAdminData, when } from './adminApi.js'

const QUEUES = [
  { id: 'submitted,under_review', label: 'To review' },
  { id: 'awaiting_transfer', label: 'Waiting for transfer' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'approved', label: 'Approved' },
]

/** /admin/payments — the review queue (oldest first). */
export function AdminPayments() {
  const [queue, setQueue] = useState(QUEUES[0].id)
  const s = useAdminData(() => adminApi.payments(queue), [queue])
  return (
    <section aria-labelledby="adm-pay">
      <AdminHeading id="adm-pay" title="Payment reviews">Oldest first. Approve only a credit you have seen in the DMC LIMITED account.</AdminHeading>
      <div className="adm-tabs" role="group" aria-label="Queue">
        {QUEUES.map((q) => (
          <button key={q.id} type="button" className="adm-tab" aria-pressed={queue === q.id} onClick={() => setQueue(q.id)}>{q.label}</button>
        ))}
      </div>
      <StateView state={s} empty={s.data?.items.length === 0 && 'Nothing here.'}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Reference</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Reported</th><th>Receipts</th><th>Status</th></tr></thead>
            <tbody>
              {s.data?.items.map((o) => (
                <tr key={o.reference}>
                  <td><Link to={`/admin/payments/${o.reference}`}>{o.reference}</Link></td>
                  <td className="adm-wrap">{o.customer?.displayName}<br /><small>{o.customer?.email}</small></td>
                  <td>{o.plan.name}{o.kind === 'renewal' ? ' (renewal)' : ''}</td>
                  <td>{money(o.plan.amountMinor)}</td>
                  <td>{when(o.submission?.submittedAt)}</td>
                  <td>{o.receipts.length}</td>
                  <td><StatusChip value={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateView>
    </section>
  )
}

/**
 * /admin/payments/:reference — review one order. Approving requires the reviewer to confirm they saw
 * this exact credit in the DMC LIMITED account and to record the amount, the credit date and the bank's
 * transaction reference. A customer's receipt alone is never enough.
 */
export function AdminPaymentDetail() {
  const { reference } = useParams()
  const { withCsrf } = useAuth()
  const ids = useId()
  const s = useAdminData(() => adminApi.payment(reference), [reference])
  const [form, setForm] = useState({ amount: '', creditedAt: '', bankTransactionRef: '', note: '', confirmed: false })
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(null)
  const o = s.data?.order

  const act = async (key, fn, done) => {
    setBusy(key)
    setNotice(null)
    try {
      await withCsrf(fn)
      setNotice({ ok: true, text: done })
      s.reload()
    } catch (error) {
      setNotice({ ok: false, text: error.message, code: error.code })
    } finally {
      setBusy(null)
    }
  }
  const approve = (e) => {
    e.preventDefault()
    const verifiedAmountMinor = Math.round(Number(form.amount) * 100)
    act('approve', (csrf) => adminApi.approve(csrf, reference, { verifiedAmountMinor, creditedAt: new Date(form.creditedAt).toISOString(), bankTransactionRef: form.bankTransactionRef.trim(), note: form.note }), 'Payment approved. The page is published.')
  }
  const reviewable = o && ['submitted', 'under_review'].includes(o.status)

  return (
    <section aria-labelledby={`${ids}-h`}>
      <p className="adm-back"><Link to="/admin/payments">← Payment reviews</Link></p>
      <AdminHeading id={`${ids}-h`} eyebrow="Payment review" title={`Order ${reference}`} />
      <AdminNotice notice={notice} focusOnShow layoutKey={s.data} />
      <StateView state={s} skeleton="detail">
        {o && (
          <div className="adm-detail">
            <dl className="adm-dl">
              <div><dt>Status</dt><dd><StatusChip value={o.status} /></dd></div>
              <div><dt>Customer</dt><dd>{o.customer?.displayName} · {o.customer?.email}</dd></div>
              <div><dt>Page</dt><dd>{o.page ? `/p/${o.page.slug} (${o.page.status})` : '—'}</dd></div>
              <div><dt>Plan</dt><dd>{o.plan.name} · {o.plan.validityDays} days{o.kind === 'renewal' ? ' · renewal' : ''}</dd></div>
              <div><dt>Amount owed</dt><dd><b>{money(o.plan.amountMinor)}</b></dd></div>
              <div><dt>Payment mode</dt><dd>{o.paymentMode === 'live' ? 'Live' : <b>Test (not real money)</b>}</dd></div>
              <div><dt>Paid by (customer says)</dt><dd>{o.submission ? `${o.submission.payerName} on ${day(o.submission.transferDate)}` : '—'}</dd></div>
              {o.submission?.note && <div><dt>Note</dt><dd>{o.submission.note}</dd></div>}
              <div>
                <dt>Receipts</dt>
                <dd>
                  {o.receipts.length === 0 && 'None'}
                  {o.receipts.map((r, i) => <a key={r.receiptId} className="adm-receipt" href={adminApi.receiptUrl(o.reference, r.receiptId)} target="_blank" rel="noopener">Receipt {i + 1} (image)</a>)}
                </dd>
              </div>
              {o.review?.decision && <div><dt>Decision</dt><dd>{o.review.decision} {when(o.review.decidedAt)} {o.review.bankTransactionRef ? `· ${o.review.bankTransactionRef}` : ''} {o.review.reason ? `· ${o.review.reason}` : ''}</dd></div>}
            </dl>

            {reviewable && o.status === 'submitted' && (
              <MagneticButton variant="secondary" size="sm" loading={busy === 'claim'} loadingLabel="Starting…" onClick={() => act('claim', (csrf) => adminApi.claim(csrf, reference), 'You’re reviewing this order.')}>Start review</MagneticButton>
            )}

            {reviewable && (
              <div className="adm-forms">
                <form className="adm-form" onSubmit={approve} aria-labelledby={`${ids}-approve`}>
                  <h2 id={`${ids}-approve`}>Approve after checking the bank account</h2>
                  <p className="adm-muted">A receipt is not proof of payment. Approve only if you saw this credit in the DMC LIMITED account.</p>
                  <label htmlFor={`${ids}-amt`}>Amount credited (₦)</label>
                  <input id={`${ids}-amt`} inputMode="decimal" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={(o.plan.amountMinor / 100).toFixed(2)} />
                  <label htmlFor={`${ids}-when`}>Credited at</label>
                  <input id={`${ids}-when`} type="datetime-local" required value={form.creditedAt} onChange={(e) => setForm({ ...form, creditedAt: e.target.value })} />
                  <label htmlFor={`${ids}-ref`}>Bank transaction reference</label>
                  <input id={`${ids}-ref`} required minLength={4} maxLength={80} value={form.bankTransactionRef} onChange={(e) => setForm({ ...form, bankTransactionRef: e.target.value })} />
                  <label htmlFor={`${ids}-note`}>Note (optional)</label>
                  <input id={`${ids}-note`} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                  <label className="adm-check">
                    <input type="checkbox" checked={form.confirmed} onChange={(e) => setForm({ ...form, confirmed: e.target.checked })} required />
                    I checked the bank account and saw this exact credit.
                  </label>
                  <MagneticButton type="submit" disabled={!form.confirmed} loading={busy === 'approve'} loadingLabel="Approving…">Approve and publish</MagneticButton>
                </form>
                <form className="adm-form" onSubmit={(e) => { e.preventDefault(); act('reject', (csrf) => adminApi.reject(csrf, reference, reason), 'Payment rejected. The customer can send new details.') }} aria-labelledby={`${ids}-reject`}>
                  <h2 id={`${ids}-reject`}>Reject</h2>
                  <label htmlFor={`${ids}-why`}>Reason for the customer</label>
                  <textarea id={`${ids}-why`} rows={3} required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={`${ids}-why-hint`} />
                  <p id={`${ids}-why-hint`} className="adm-muted">
                    Customer-visible: shown on their order page and in the email we send them. Write it for the customer; keep internal details out. {reason.length} of 500 characters.
                  </p>
                  <button type="submit" className="adm-btn adm-btn--danger" disabled={busy === 'reject'}>Reject payment</button>
                </form>
              </div>
            )}
          </div>
        )}
      </StateView>
    </section>
  )
}
