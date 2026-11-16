import { useState } from 'react'
import { Link } from 'react-router'
import CopyButton from '../../components/CopyButton/CopyButton.jsx'
import ShareLinks from '../../components/ShareLinks/ShareLinks.jsx'
import { CATEGORY_LABELS, getTemplateBySlug } from '../../data/templates.js'
import { publicationAction } from './dashboardData.js'
import { longDate, publicationState } from './publicationState.js'

const REASONS = {
  suspended: 'Suspended pages can’t be renewed. Please contact support.',
  renewal_in_progress: 'A payment for this page is in progress.',
  payment: 'Finish or check the payment for this page.',
  scheduled: 'This page goes live soon.',
}

/**
 * "My published pages": every page with a payment, its real address, state, plan and dates, from
 * `data` (the dashboard's publications, orders and site). Renew is offered only when the server would
 * accept it (see publicationAction).
 */
export default function AccountPublications({ data }) {
  const [sharing, setSharing] = useState(null) // slug whose share options are open
  const { phase, publications = [], orders = [], site, reload } = data

  return (
    <section id="published" className="account-section account-published" aria-labelledby="account-published-title" aria-busy={phase === 'loading'}>
      <h2 id="account-published-title">Published pages</h2>
      {phase === 'error' && !data.publicationsLoaded && (
        <p className="account-published__error" role="alert">
          Your published pages couldn’t be loaded.{' '}
          <button type="button" className="link-button" onClick={reload}>
            Try again
          </button>
        </p>
      )}
      {phase !== 'loading' && data.publicationsLoaded !== false && publications.length === 0 && (
        <p className="account-drafts__empty">
          No published pages yet. Open one of your drafts and choose <b>Publish</b> to give it its own address.
        </p>
      )}
      <ul className="account-published__list">
        {publications.map((p) => {
          const st = publicationState(p)
          const title = p.pageTitle || p.title || 'Untitled page'
          const live = p.publiclyVisible && !p.suspended && p.url
          const action = publicationAction(p, orders)
          const template = p.templateSlug ? getTemplateBySlug(p.templateSlug) : null
          return (
            <li key={p.slug} className={`account-published__item account-published__item--${st.tone}`}>
              <div className="account-published__head">
                <p className="account-published__title">{title}</p>
                <span className={`account-badge account-badge--${st.tone === 'ok' ? 'ok' : 'pending'}`}>{st.label}</span>
              </div>
              {live ? (
                <a className="account-published__url" href={p.url} target="_blank" rel="noopener noreferrer">
                  {p.url}
                </a>
              ) : (
                <p className="account-published__url account-published__url--off">{p.url ?? p.path}</p>
              )}
              <dl className="account-published__facts">
                {template && (
                  <div>
                    <dt>Template</dt>
                    <dd>
                      {template.name} · {CATEGORY_LABELS[template.category] ?? template.category}
                    </dd>
                  </div>
                )}
                {p.planName && (
                  <div>
                    <dt>Plan</dt>
                    <dd>{p.planName}</dd>
                  </div>
                )}
                {p.activatedAt && (
                  <div>
                    <dt>Published</dt>
                    <dd>{longDate(p.activatedAt)}</dd>
                  </div>
                )}
                {p.expiresAt && (
                  <div>
                    <dt>{p.publiclyVisible ? 'Live until' : 'Ended'}</dt>
                    <dd>{longDate(p.expiresAt)}</dd>
                  </div>
                )}
                {!p.expiresAt && p.complimentary && p.publiclyVisible && (
                  <div>
                    <dt>Live until</dt>
                    <dd>No end date</dd>
                  </div>
                )}
              </dl>
              {st.hint && !p.publiclyVisible && <p className="account-published__meta">{st.hint}</p>}
              {action.reason && REASONS[action.reason] && <p className="account-published__meta">{REASONS[action.reason]}</p>}
              <div className="account-published__actions">
                {live && (
                  <>
                    <a className="btn btn--ghost btn--sm" href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`View ${title}`}>
                      View
                    </a>
                    <CopyButton value={p.url} label="Copy Link" className="btn btn--ghost btn--sm" />
                    <button type="button" className="btn btn--ghost btn--sm" aria-expanded={sharing === p.slug} onClick={() => setSharing((s) => (s === p.slug ? null : p.slug))}>
                      Share
                    </button>
                  </>
                )}
                {!p.pageDeleted && p.templateSlug && (
                  <Link className="btn btn--ghost btn--sm" to={`/editor/${p.templateSlug}?page=${p.pageId}`} aria-label={`Edit ${title}`}>
                    Edit
                  </Link>
                )}
                {action.canRenew && (
                  <Link className="btn btn--ghost btn--sm" to={`/publish/${p.pageId}`} aria-label={`${action.renewLabel} ${title}`}>
                    {action.renewLabel}
                  </Link>
                )}
                {action.orderRef && (
                  <Link className="btn btn--ghost btn--sm" to={`/orders/${action.orderRef}`}>
                    View payment
                  </Link>
                )}
                {p.suspended && (
                  <Link className="btn btn--ghost btn--sm" to={`/contact?topic=publishing&ref=${encodeURIComponent(`/p/${p.slug}`)}`}>
                    Contact support
                  </Link>
                )}
              </div>
              {live && sharing === p.slug && (
                <div className="account-published__share">
                  <ShareLinks url={p.url} title={title} local={Boolean(site?.local)} compact />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {site?.local && publications.some((p) => p.publiclyVisible) && sharing === null && (
        <p className="account-published__dev" role="note">
          These are development links: they only work on this computer while MyLinnnk runs here.
        </p>
      )}
    </section>
  )
}
