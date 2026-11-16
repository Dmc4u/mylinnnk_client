import NeonRingLoader from '../components/Loading/NeonRingLoader.jsx'
import MagneticButton from '../components/UI/MagneticButton.jsx'
import useDelayedLoading from '../hooks/useDelayedLoading.js'
import ReauthPrompt from './ReauthPrompt.jsx'
import { REAUTH_CODE } from './reauth.js'

/**
 * Shared building blocks of the admin views, in the MyLinnnk visual system.
 *
 * Loading follows the site's patterns: nothing for the first 200 ms (useDelayedLoading, as in the
 * editor and public pages), then a skeleton shaped like the content (lists, stat cards, like the
 * account drafts list) or the Neon Ring Loader (single records).
 */

function Skeleton({ kind }) {
  if (kind === 'detail') return <NeonRingLoader mode="centered" message="Loading…" className="adm-loader" />
  const rows = kind === 'cards' ? 4 : 5
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      <span className="sr-only">Loading…</span>
      <div className={`adm-skeleton adm-skeleton--${kind}`} aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <span className="adm-skeleton__item" key={i}>
            <span className="adm-skeleton__line adm-skeleton__line--title" />
            <span className="adm-skeleton__line" />
          </span>
        ))}
      </div>
    </div>
  )
}

/** Loading / error / empty states shared by every admin view. skeleton: 'table' | 'cards' | 'detail'. */
export default function StateView({ state, empty, children, skeleton = 'table' }) {
  const showLoading = useDelayedLoading(state.status === 'loading')
  if (state.status === 'loading') return showLoading ? <Skeleton kind={skeleton} /> : <div className="adm-pending" aria-busy="true" />
  if (state.status === 'error') {
    if (state.error.code === REAUTH_CODE) {
      return (
        <div className="adm-state adm-state--error" role="alert">
          <ReauthPrompt />
        </div>
      )
    }
    return (
      <div className="adm-state adm-state--error" role="alert">
        <p>{state.error.status === 403 ? 'You don’t have access to this.' : state.error.message}</p>
        <MagneticButton variant="navy" size="sm" onClick={state.reload}>Try again</MagneticButton>
      </div>
    )
  }
  if (empty) return <p className="adm-state adm-state--empty">{empty}</p>
  return children
}

/** Page heading shared by every section. */
export function AdminHeading({ id, eyebrow = 'Administration', title, children }) {
  return (
    <div className="adm-heading">
      <p className="adm-heading__eyebrow">{eyebrow}</p>
      <h1 id={id}>{title}</h1>
      {children && <p className="adm-heading__lead">{children}</p>}
    </div>
  )
}

const TONES = {
  active: 'ok', approved: 'ok', live: 'ok', success: 'ok', responded: 'ok',
  new: 'wait', in_progress: 'review', closed: 'neutral',
  submitted: 'review', under_review: 'review', pending_review: 'review', scheduled: 'review',
  awaiting_transfer: 'wait', pending_payment: 'wait', grace: 'wait', draft: 'wait',
  rejected: 'bad', expired: 'bad', cancelled: 'bad', unpublished: 'bad', suspended: 'bad', denied: 'bad', failure: 'bad',
}

/** A status as a small pill coloured with the site's status tokens. The text is always the status itself. */
export function StatusChip({ value }) {
  if (!value) return '—'
  return <span className={`adm-chip adm-chip--${TONES[value] ?? 'neutral'}`}>{String(value).replaceAll('_', ' ')}</span>
}
