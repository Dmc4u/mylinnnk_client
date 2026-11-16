import { useId } from 'react'
import { Link } from 'react-router'
import { SUPPORT_EMAIL } from '../../utils/contact.js'
import './InfoPages.css'

/**
 * Shared building blocks for the site's information pages (/contact, /request-quote, /privacy-policy,
 * /terms-of-service, /cookie-settings). Motion uses the site's own entrance (page-fade-up), <Reveal>
 * for content further down, and pure CSS for the decorative line and the reading progress bar, so
 * reduced-motion preferences are respected by the site-wide rules.
 */

/** Thin reading-progress bar along the top (CSS scroll-driven animation; absent where unsupported). */
export function ScrollProgress() {
  return <div className="info-progress" aria-hidden="true" />
}

/**
 * Split hero: eyebrow, a headline of one or more lines, lead text and actions on the left; an aside
 * (contact details, quick facts) on the right. A thin line draws itself behind it.
 */
export function InfoHero({ eyebrow, lines, lead, children, aside, compact = false }) {
  const id = useId()
  return (
    <header className={`info-hero container${compact ? ' info-hero--compact' : ''}`} aria-labelledby={id}>
      <svg className="info-hero__line" viewBox="0 0 600 600" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M 120 0 L 0 600" pathLength="1" />
        <path d="M 600 120 L 210 600" pathLength="1" />
      </svg>
      <div className="info-hero__main">
        {eyebrow && <p className="info-hero__eyebrow">{eyebrow}</p>}
        <h1 id={id} className="info-hero__title">
          {lines.map((text, i) => (
            <span key={text} className="info-hero__line-text" style={{ '--i': i }}>
              {text}
            </span>
          ))}
        </h1>
        {lead && <p className="info-hero__lead">{lead}</p>}
        {children && <div className="info-hero__actions">{children}</div>}
      </div>
      {aside && <aside className="info-hero__aside">{aside}</aside>}
    </header>
  )
}

/** The support address as a large, underlined link (with a short note). */
export function SupportEmail({ note }) {
  return (
    <>
      <p className="info-aside__label">Write to us</p>
      <a className="info-aside__email" href={`mailto:${SUPPORT_EMAIL}`}>
        {SUPPORT_EMAIL}
      </a>
      {note && <p className="info-aside__note">{note}</p>}
    </>
  )
}

/** The hidden spam trap: people never see or fill it; automated forms often do. */
export function SpamTrap({ value, onChange }) {
  return (
    <div className="info-trap" aria-hidden="true">
      <label>
        Leave this empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange('website', e.target.value)} />
      </label>
    </div>
  )
}

/** Sent: a calm confirmation with the reference and what happens next. */
export function EnquirySent({ title, reference, children, onAnother, anotherLabel }) {
  return (
    <div className="info-sent" role="status" aria-live="polite">
      <svg className="info-sent__mark" viewBox="0 0 52 52" aria-hidden="true" focusable="false">
        <circle cx="26" cy="26" r="24" pathLength="1" />
        <path d="M15 27 l7 7 l15 -16" pathLength="1" />
      </svg>
      <h2 className="info-sent__title">{title}</h2>
      {reference && (
        <p className="info-sent__ref">
          Your reference: <strong>{reference}</strong>
        </p>
      )}
      <div className="info-sent__body">{children}</div>
      <div className="info-sent__actions">
        <Link to="/templates" className="btn btn--ghost btn--sm">
          Browse templates
        </Link>
        {onAnother && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onAnother}>
            {anotherLabel}
          </button>
        )}
      </div>
    </div>
  )
}

