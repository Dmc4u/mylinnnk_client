import { useEffect, useId, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import MagneticButton from '../components/UI/MagneticButton.jsx'
import { AdminNotice } from './ReauthPrompt.jsx'
import StateView, { AdminHeading, StatusChip } from './StateView.jsx'
import { adminApi, useAdminData, when } from './adminApi.js'

/**
 * /admin/email-deliveries — notification email monitoring: the worker's health, delivery counts, a filtered
 * list (recipients masked by the server; no email content is ever sent to the browser) and manual retries
 * of failed deliveries. The server checks every retry again (relevance, recipient, limits) and queues it once.
 */
const HEALTH_REFRESH_MS = 30_000
const STATES = [
  ['', 'Any status'],
  ['pending', 'Queued'],
  ['sending', 'Sending'],
  ['retry', 'Retrying'],
  ['sent', 'Sent'],
  ['skipped', 'Skipped'],
  ['dead', 'Failed'],
]
const STATE_LABEL = Object.fromEntries(STATES.filter(([v]) => v))
const WORKER_LABEL = { running: 'Running', stale: 'Not responding', stopped: 'Stopped', disabled: 'Notifications off' }
const SKIP_REASON = {
  unverified: 'Address not verified',
  no_account: 'No active account',
  no_recipient: 'No recipient',
  outdated: 'No longer relevant',
  unknown_type: 'No longer sent',
}
const NOT_RETRYABLE = {
  retry_limit: 'Retry limit reached',
  too_old: 'Too old to resend',
  unknown_type: 'No longer sent',
}
const typeLabel = (type) => type.replace('.', ': ').replaceAll('_', ' ')

function WorkerHealth({ health }) {
  const problem = ['stale', 'stopped'].includes(health.status)
  return (
    <div className="adm-health">
      {problem && (
        <p className="adm-error" role="alert">
          {health.status === 'stale' ? 'The notification worker is not responding.' : 'The notification worker has stopped.'} Emails wait in the queue until it runs again
          {health.lastHeartbeatAt ? ` (last seen ${when(health.lastHeartbeatAt)}).` : '.'} Check the mylinnnk-notifier process on the server.
        </p>
      )}
      {health.smtp.unreachable && (
        <p className="adm-error" role="alert">
          The mail server could not be reached ({health.smtp.lastFailureCode ?? 'unknown error'}, {when(health.smtp.lastFailureAt)}). Emails are kept and sent when it answers again.
        </p>
      )}
      <dl className="adm-dl adm-health__list">
        <div><dt>Worker</dt><dd><StatusChip value={health.status} label={WORKER_LABEL[health.status]} /></dd></div>
        <div><dt>Last heartbeat</dt><dd>{when(health.lastHeartbeatAt)}{health.workers.length > 1 ? ` · ${health.workers.length} workers` : ''}</dd></div>
        <div><dt>Scheduler (reminders, recovery)</dt><dd>{health.scheduler.lastRunAt ? `Last run ${when(health.scheduler.lastRunAt)}` : 'Not run yet'}{health.scheduler.lastRunAt && !health.scheduler.healthy ? <b className="adm-warn-text"> · overdue</b> : ''}</dd></div>
        <div><dt>Queue</dt><dd>{health.queue.backlog} waiting{health.queue.oldestPendingAt ? ` · oldest from ${when(health.queue.oldestPendingAt)}` : ''}</dd></div>
        <div><dt>Retrying / failed</dt><dd>{health.queue.retrying} retrying · {health.queue.dead ? <b className="adm-warn-text">{health.queue.dead} failed</b> : '0 failed'}</dd></div>
        <div><dt>Interrupted sends</dt><dd>{health.queue.stalled ? `${health.queue.stalled} (resumed automatically)` : 'None'}</dd></div>
        <div><dt>Events</dt><dd>{health.events.pending} waiting{health.events.stalled ? <b className="adm-warn-text"> · {health.events.stalled} delayed</b> : ''}{health.events.failed ? <b className="adm-warn-text"> · {health.events.failed} failed</b> : ''}</dd></div>
        <div><dt>Mail server</dt><dd>{health.smtp.lastSuccessAt ? `Last accepted ${when(health.smtp.lastSuccessAt)}` : 'No email sent yet'}{health.smtp.lastFailureAt ? ` · last failure ${when(health.smtp.lastFailureAt)}` : ''}</dd></div>
      </dl>
      <p className="adm-muted">Checked {when(health.checkedAt)}. Refreshes every 30 seconds.</p>
    </div>
  )
}

function RetryCell({ delivery, busy, confirming, onAsk, onCancel, onConfirm }) {
  if (delivery.retryable) {
    if (confirming) {
      return (
        <span className="adm-retry-confirm" role="group" aria-label={`Send this ${typeLabel(delivery.type)} email again`}>
          <button type="button" className="adm-btn adm-btn--sm" disabled={busy} onClick={onConfirm}>
            {busy ? 'Sending…' : 'Send again'}
          </button>
          <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </span>
      )
    }
    return (
      <button type="button" className="adm-btn adm-btn--sm" onClick={onAsk}>
        Retry
      </button>
    )
  }
  return delivery.state === 'dead' ? <small className="adm-muted">{NOT_RETRYABLE[delivery.notRetryableReason] ?? '—'}</small> : null
}

export default function AdminDeliveries() {
  const ids = useId()
  const { withCsrf } = useAuth()
  const [filters, setFilters] = useState({ state: '', type: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const health = useAdminData(() => adminApi.deliveryHealth(), [])
  const list = useAdminData(() => adminApi.deliveries({ ...filters, page }), [filters.state, filters.type, filters.from, filters.to, page])
  const { reload: reloadHealth } = health

  useEffect(() => {
    const timer = setInterval(reloadHealth, HEALTH_REFRESH_MS)
    return () => clearInterval(timer)
  }, [reloadHealth])

  const set = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }
  const retry = async (delivery) => {
    setBusy(delivery.id)
    setNotice(null)
    try {
      await withCsrf((csrf) => adminApi.retryDelivery(csrf, delivery.id))
      setNotice({ ok: true, text: `The ${typeLabel(delivery.type)} email to ${delivery.recipient} is queued again. It is checked once more before it is sent.` })
    } catch (error) {
      setNotice({ ok: false, text: error.message, code: error.code })
    } finally {
      setBusy(null)
      setConfirming(null)
      list.reload()
      health.reload()
    }
  }
  const sum = list.data?.summary

  return (
    <section aria-labelledby={`${ids}-h`}>
      <AdminHeading id={`${ids}-h`} title="Email delivery">Notification emails, the worker that sends them, and failed deliveries. Addresses are masked; email content is never shown.</AdminHeading>
      <AdminNotice notice={notice} focusOnShow layoutKey={list.data} />

      <h2 className="adm-subheading">Worker</h2>
      <StateView state={health} skeleton="detail">
        {health.data && <WorkerHealth health={health.data.health} />}
      </StateView>

      <h2 className="adm-subheading">Deliveries</h2>
      {sum && (
        <div className="adm-cards">
          <div className="adm-card adm-card--navy"><span className="adm-card__label">Queued</span><b className="adm-card__value">{sum.queued}</b><small>Waiting to be sent</small></div>
          <div className="adm-card adm-card--teal"><span className="adm-card__label">Sent</span><b className="adm-card__value">{sum.sent}</b><small>{sum.sentLast24h} in the last 24 hours</small></div>
          <div className="adm-card adm-card--purple"><span className="adm-card__label">Retrying</span><b className="adm-card__value">{sum.retry}</b><small>Tried again automatically</small></div>
          <div className={`adm-card adm-card--accent${sum.dead ? ' adm-card--alert' : ''}`}><span className="adm-card__label">Failed</span><b className="adm-card__value">{sum.dead}</b><small>Can be retried from the list</small></div>
          <div className="adm-card adm-card--muted"><span className="adm-card__label">Skipped</span><b className="adm-card__value">{sum.skipped}</b><small>Not needed or not allowed</small></div>
        </div>
      )}

      <div className="adm-filters" role="group" aria-label="Filter deliveries">
        <label className="adm-filter">
          <span>Status</span>
          <select value={filters.state} onChange={(e) => set('state', e.target.value)}>
            {STATES.map(([v, l]) => (
              <option key={v || 'any'} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="adm-filter">
          <span>Type</span>
          <select value={filters.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">Any type</option>
            {(list.data?.types ?? []).map((t) => (
              <option key={t} value={t}>{typeLabel(t)}</option>
            ))}
          </select>
        </label>
        <label className="adm-filter">
          <span>From</span>
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set('from', e.target.value)} />
        </label>
        <label className="adm-filter">
          <span>To</span>
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set('to', e.target.value)} />
        </label>
        {(filters.state || filters.type || filters.from || filters.to) && (
          <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => { setFilters({ state: '', type: '', from: '', to: '' }); setPage(1) }}>
            Clear filters
          </button>
        )}
      </div>

      <StateView state={list} empty={list.data?.items.length === 0 && 'No deliveries match these filters.'}>
        <div className="adm-table-wrap">
          <table className="adm-table adm-deliveries">
            <caption className="sr-only">Email deliveries, newest first. Times are in your local time.</caption>
            <thead>
              <tr><th scope="col">Created</th><th scope="col">Type</th><th scope="col">Recipient</th><th scope="col">Status</th><th scope="col">Attempts</th><th scope="col">Sent / next try</th><th scope="col">Details</th><th scope="col"><span className="sr-only">Action</span></th></tr>
            </thead>
            <tbody>
              {list.data?.items.map((d) => (
                <tr key={d.id}>
                  <td>{when(d.createdAt)}</td>
                  <td className="adm-wrap">{typeLabel(d.type)}</td>
                  <td>{d.recipient}</td>
                  <td><StatusChip value={d.state} label={STATE_LABEL[d.state]} /></td>
                  <td>{d.attempts}{d.manualRetries ? ` (${d.manualRetries} by hand)` : ''}</td>
                  <td>{d.sentAt ? when(d.sentAt) : d.nextAttemptAt ? `Next: ${when(d.nextAttemptAt)}` : '—'}</td>
                  <td className="adm-wrap">{d.state === 'skipped' ? SKIP_REASON[d.reason] ?? d.reason ?? '—' : d.lastError ? <code>{d.lastError}</code> : '—'}</td>
                  <td>
                    <RetryCell
                      delivery={d}
                      busy={busy === d.id}
                      confirming={confirming === d.id}
                      onAsk={() => setConfirming(d.id)}
                      onCancel={() => setConfirming(null)}
                      onConfirm={() => retry(d)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.data && list.data.total > list.data.pageSize && (
          <div className="adm-pager">
            <button type="button" className="adm-btn adm-btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span>Page {page} of {Math.ceil(list.data.total / list.data.pageSize)}</span>
            <button type="button" className="adm-btn adm-btn--sm" disabled={page * list.data.pageSize >= list.data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </StateView>
      {list.status === 'ready' && <MagneticButton variant="secondary" size="sm" onClick={() => { list.reload(); health.reload() }}>Refresh</MagneticButton>}
    </section>
  )
}
