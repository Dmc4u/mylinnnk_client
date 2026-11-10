import BrandMark from '../Brand/BrandMark.jsx'
import './AuthLayout.css'

/**
 * Centered card used by every account screen (log in, sign up, password
 * recovery, email verification, account). Account screens are not indexed.
 */
export default function AuthLayout({ title, pageTitle, lead, children, footer, wide = false }) {
  return (
    <section className="auth-page">
      <title>{`${pageTitle ?? title} · MyLinnnk`}</title>
      <meta name="robots" content="noindex" />
      <div className="auth-page__glow" aria-hidden="true" />
      <div className={`auth-card${wide ? ' auth-card--wide' : ''}`}>
        <div className="auth-card__head">
          <BrandMark size={44} />
          <h1 className="auth-card__title">{title}</h1>
          {lead && <p className="auth-card__lead">{lead}</p>}
        </div>
        <div className="auth-card__body">{children}</div>
        {footer && <div className="auth-card__footer">{footer}</div>}
      </div>
    </section>
  )
}

/** Centered spinner + text for "checking your session…" style states. */
export function AuthPending({ children }) {
  return (
    <div className="auth-pending" role="status">
      <span className="auth-pending__spinner" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
