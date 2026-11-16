import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import MagneticButton from '../components/UI/MagneticButton.jsx'
import { AdminNotice } from './ReauthPrompt.jsx'
import StateView, { AdminHeading, StatusChip } from './StateView.jsx'
import { adminApi, useAdminData, when } from './adminApi.js'

const ENQUIRY_STATUSES = [
  ['new', 'New'],
  ['in_progress', 'In progress'],
  ['responded', 'Responded'],
  ['closed', 'Closed'],
]
const ENQUIRY_PRIORITIES = [
  ['low', 'Low'],
  ['normal', 'Normal'],
  ['high', 'High'],
  ['urgent', 'Urgent'],
]
const TYPES = [
  ['', 'All'],
  ['contact', 'Contact'],
  ['quote', 'Quote requests'],
]
const labelOf = (list, value) => list.find(([v]) => v === value)?.[1] ?? value

/** A reply in the support mailbox's own email program (no email is sent by MyLinnnk itself). */
const replyHref = (e) =>
  `mailto:${encodeURIComponent(e.email)}?subject=${encodeURIComponent(`Re: ${e.type === 'quote' ? 'Your quote request' : e.subjectLine || e.subject || 'Your message'} [${e.reference}]`)}`

/** /admin/enquiries — contact messages and quote requests, newest first, with filters and search. */
export function AdminEnquiries() {
  const ids = useId()
  const [filters, setFilters] = useState({ type: '', status: '', priority: '', q: '' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const s = useAdminData(() => adminApi.enquiries({ ...filters, page }), [filters.type, filters.status, filters.priority, filters.q, page])
  const sum = s.data?.summary
  const set = (key, value) => {
    setPage(1)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  return (
    <section aria-labelledby={`${ids}-h`}>
      <AdminHeading id={`${ids}-h`} title="Enquiries">
        Contact messages and quote requests. Replies go from the support mailbox; notes are private to administration.
      </AdminHeading>

      {sum && (
        <div className="adm-cards">
          <button type="button" className="adm-card adm-card--accent adm-card--button" onClick={() => set('status', 'new')} aria-pressed={filters.status === 'new'}>
            <span className="adm-card__label">New</span>
            <b className="adm-card__value">{sum.byStatus.new}</b>
            <small>Waiting for a first reply</small>
          </button>
          <button type="button" className="adm-card adm-card--purple adm-card--button" onClick={() => set('status', 'in_progress')} aria-pressed={filters.status === 'in_progress'}>
            <span className="adm-card__label">In progress</span>
            <b className="adm-card__value">{sum.byStatus.in_progress}</b>
            <small>{sum.byStatus.responded} responded · {sum.byStatus.closed} closed</small>
          </button>
          <button type="button" className="adm-card adm-card--teal adm-card--button" onClick={() => set('type', 'quote')} aria-pressed={filters.type === 'quote'}>
            <span className="adm-card__label">Quote requests</span>
            <b className="adm-card__value">{sum.byType.quote}</b>
            <small>{sum.byType.contact} contact messages</small>
          </button>
          <div className={`adm-card adm-card--navy${sum.notificationFailed ? ' adm-card--alert' : ''}`}>
            <span className="adm-card__label">Email not delivered</span>
            <b className="adm-card__value">{sum.notificationFailed}</b>
            <small>{sum.notificationFailed ? 'Saved here; the inbox email failed' : 'Every enquiry reached the inbox'}</small>
          </div>
        </div>
      )}

      <div className="adm-filters" role="group" aria-label="Filter enquiries">
        <div className="adm-tabs" role="group" aria-label="Type">
          {TYPES.map(([v, l]) => (
            <button key={v || 'all'} type="button" className="adm-tab" aria-pressed={filters.type === v} onClick={() => set('type', v)}>
              {l}
            </button>
          ))}
        </div>
        <label className="adm-filter">
          <span>Status</span>
          <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">Any status</option>
            {ENQUIRY_STATUSES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="adm-filter">
          <span>Priority</span>
          <select value={filters.priority} onChange={(e) => set('priority', e.target.value)}>
            <option value="">Any priority</option>
            {ENQUIRY_PRIORITIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <form
          className="adm-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            set('q', search.trim())
          }}
        >
          <label htmlFor={`${ids}-q`} className="sr-only">
            Search by reference, name or email
          </label>
          <input id={`${ids}-q`} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ENQ-…, name or email" maxLength={254} />
          <button type="submit" className="adm-btn adm-btn--sm">
            Search
          </button>
        </form>
      </div>

      <StateView state={s} empty={s.data?.items.length === 0 && 'No enquiries match.'}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>From</th>
                <th>About</th>
                <th>Received</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {s.data?.items.map((e) => (
                <tr key={e.reference}>
                  <td>
                    <Link to={`/admin/enquiries/${e.reference}`}>{e.reference}</Link>
                    <br />
                    <small>{e.type === 'quote' ? 'Quote request' : 'Contact'}</small>
                  </td>
                  <td className="adm-wrap">
                    {e.name}
                    <br />
                    <small>{e.email}</small>
                  </td>
                  <td className="adm-wrap">
                    {e.subject}
                    {e.topic && (
                      <>
                        <br />
                        <small>{e.topic}</small>
                      </>
                    )}
                    {e.notification === 'failed' && (
                      <>
                        <br />
                        <small className="adm-warn-text">Inbox email failed</small>
                      </>
                    )}
                  </td>
                  <td>{when(e.createdAt)}</td>
                  <td>
                    <span className={`adm-priority adm-priority--${e.priority}`}>{labelOf(ENQUIRY_PRIORITIES, e.priority)}</span>
                  </td>
                  <td>
                    <StatusChip value={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {s.data && s.data.total > s.data.pageSize && (
          <div className="adm-pager">
            <button type="button" className="adm-btn adm-btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {Math.ceil(s.data.total / s.data.pageSize)}
            </span>
            <button type="button" className="adm-btn adm-btn--sm" disabled={page * s.data.pageSize >= s.data.total} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        )}
      </StateView>
    </section>
  )
}

/** /admin/enquiries/:reference — one enquiry: details, sender context, status, priority, notes and reply. */
export function AdminEnquiryDetail() {
  const { reference } = useParams()
  const { withCsrf } = useAuth()
  const ids = useId()
  const s = useAdminData(() => adminApi.enquiry(reference), [reference])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const e = s.data?.enquiry
  const ctx = s.data?.context

  const act = async (key, fn, done) => {
    setBusy(key)
    setNotice(null)
    try {
      await withCsrf(fn)
      setNotice({ ok: true, text: done })
      s.reload()
      return true
    } catch (error) {
      setNotice({ ok: false, text: error.message, code: error.code })
      return false
    } finally {
      setBusy(null)
    }
  }
  const update = (body, done) => act('update', (csrf) => adminApi.updateEnquiry(csrf, reference, body), done)
  const addNote = async (event) => {
    event.preventDefault()
    if (await act('note', (csrf) => adminApi.addEnquiryNote(csrf, reference, note.trim()), 'Note added.')) setNote('')
  }

  return (
    <section aria-labelledby={`${ids}-h`}>
      <p className="adm-back">
        <Link to="/admin/enquiries">← Enquiries</Link>
      </p>
      <AdminHeading id={`${ids}-h`} eyebrow={e?.type === 'quote' ? 'Quote request' : 'Contact message'} title={reference} />
      <AdminNotice notice={notice} />
      <StateView state={s} skeleton="detail">
        {e && (
          <div className="adm-detail">
            <div className="adm-enquiry-actions">
              <MagneticButton href={replyHref(e)} size="sm">
                Reply by email
              </MagneticButton>
              <label className="adm-filter">
                <span>Status</span>
                <select value={e.status} disabled={busy === 'update'} onChange={(ev) => update({ status: ev.target.value }, `Status: ${labelOf(ENQUIRY_STATUSES, ev.target.value)}.`)}>
                  {ENQUIRY_STATUSES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-filter">
                <span>Priority</span>
                <select value={e.priority} disabled={busy === 'update'} onChange={(ev) => update({ priority: ev.target.value }, `Priority: ${labelOf(ENQUIRY_PRIORITIES, ev.target.value)}.`)}>
                  {ENQUIRY_PRIORITIES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {e.status !== 'responded' && (
                <button type="button" className="adm-btn adm-btn--sm" disabled={busy === 'update'} onClick={() => update({ status: 'responded' }, 'Marked as responded.')}>
                  Mark as responded
                </button>
              )}
            </div>

            <dl className="adm-dl">
              <div><dt>Received</dt><dd>{when(e.createdAt)}</dd></div>
              <div><dt>From</dt><dd>{e.name} · <a href={`mailto:${e.email}`}>{e.email}</a>{e.phone ? ` · ${e.phone}` : ''}</dd></div>
              {e.country && <div><dt>Country</dt><dd>{e.country}</dd></div>}
              {e.category && <div><dt>Topic</dt><dd>{e.category.label}</dd></div>}
              {e.subjectLine && <div><dt>Subject</dt><dd>{e.subjectLine}</dd></div>}
              {e.occasion && <div><dt>Page type</dt><dd>{e.occasion.label}</dd></div>}
              {e.service && <div><dt>Service</dt><dd>{e.service.label}</dd></div>}
              {e.budget && <div><dt>Budget</dt><dd>{e.budget.label}</dd></div>}
              {e.timeline && <div><dt>Timeline</dt><dd>{e.timeline.label}</dd></div>}
              {e.context && <div><dt>Looking at</dt><dd>{[e.context.plan && `Plan: ${e.context.plan}`, e.context.page && `Page: ${e.context.page}`].filter(Boolean).join(' · ')}</dd></div>}
              <div>
                <dt>Inbox email</dt>
                <dd>{e.notification.state === 'sent' ? `Delivered ${when(e.notification.sentAt)}` : e.notification.state === 'failed' ? <b className="adm-warn-text">Not delivered: reply from here</b> : 'Pending'}</dd>
              </div>
            </dl>

            <div className="adm-message">
              <h2>{e.type === 'quote' ? 'Project description' : 'Message'}</h2>
              <p>{e.message ?? e.description}</p>
            </div>

            <div className="adm-forms">
              <div className="adm-form" aria-labelledby={`${ids}-ctx`}>
                <h2 id={`${ids}-ctx`}>Customer context</h2>
                {ctx?.account ? (
                  <>
                    <p>
                      Account: <b>{ctx.account.displayName}</b> {ctx.account.emailVerified ? '(verified)' : '(email not verified)'} · since {when(ctx.account.since)}
                    </p>
                    {ctx.publications.length > 0 && (
                      <p>
                        Pages:{' '}
                        {ctx.publications.map((p) => (
                          <span key={p.slug} className="adm-ctx-item">
                            /p/{p.slug} <StatusChip value={p.suspended ? 'suspended' : p.status} />
                          </span>
                        ))}
                      </p>
                    )}
                    {ctx.orders.length > 0 && (
                      <p>
                        Orders:{' '}
                        {ctx.orders.map((o) => (
                          <span key={o.reference} className="adm-ctx-item">
                            <Link to={`/admin/payments/${o.reference}`}>{o.reference}</Link> <StatusChip value={o.status} />
                          </span>
                        ))}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="adm-muted">No MyLinnnk account uses this email address.</p>
                )}
                {ctx?.mentionedPage && (
                  <p>
                    Page mentioned: /p/{ctx.mentionedPage.slug} <StatusChip value={ctx.mentionedPage.suspended ? 'suspended' : ctx.mentionedPage.status} />
                  </p>
                )}
              </div>

              <form className="adm-form" onSubmit={addNote} aria-labelledby={`${ids}-notes`}>
                <h2 id={`${ids}-notes`}>Internal notes</h2>
                <p className="adm-muted">Private to administration; never shown to the customer.</p>
                {e.notes.length === 0 && <p className="adm-muted">No notes yet.</p>}
                <ol className="adm-notes">
                  {e.notes.map((n) => (
                    <li key={n.id}>
                      <small>
                        {when(n.at)}
                        {n.authorName ? ` · ${n.authorName}` : ''}
                      </small>
                      <p>{n.text}</p>
                    </li>
                  ))}
                </ol>
                <label htmlFor={`${ids}-note`}>Add a note</label>
                <textarea id={`${ids}-note`} rows={3} maxLength={2000} value={note} onChange={(ev) => setNote(ev.target.value)} required />
                <MagneticButton type="submit" size="sm" disabled={!note.trim()} loading={busy === 'note'} loadingLabel="Saving…">
                  Save note
                </MagneticButton>
              </form>
            </div>
          </div>
        )}
      </StateView>
    </section>
  )
}
