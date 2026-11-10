/**
 * Small building blocks shared by template sections.
 * Images are content: { src, alt, focus?, credit? }. Decorative ornaments are
 * presentation and come from the theme, never from user content.
 */

const FOCUS = {
  center: '50% 50%',
  top: '50% 20%',
  bottom: '50% 80%',
  left: '25% 50%',
  right: '75% 50%',
}

export function Img({ image, className = '', eager = false }) {
  if (!image?.src) return <span className={`ts-img ts-img--empty ${className}`} aria-hidden="true" />
  return (
    <img
      className={`ts-img ${className}`}
      src={image.src}
      alt={image.alt ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable="false"
      style={{ objectPosition: FOCUS[image.focus] ?? image.focus ?? FOCUS.center }}
    />
  )
}

/** Looks like a button, but templates are static previews — no action yet. */
export const Action = ({ children, variant = 'solid' }) =>
  children ? <span className={`ts-action ts-action--${variant}`}>{children}</span> : null

export const Eyebrow = ({ children }) => (children ? <p className="ts-eyebrow">{children}</p> : null)

/* ---------- Ornaments (original line art, inherit currentColor) ---------- */

export function Ornament({ kind, className = '' }) {
  const common = { className: `ts-ornament ts-ornament--${kind} ${className}`, 'aria-hidden': true, focusable: 'false' }
  switch (kind) {
    case 'botanical':
      return (
        <svg {...common} viewBox="0 0 220 120" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M10 110C60 90 100 60 150 20" />
          <path d="M40 98c-6-14-2-26 10-34 4 14 0 26-10 34Z" />
          <path d="M62 86c-2-16 6-27 20-31 0 15-7 26-20 31Z" />
          <path d="M86 70c0-15 9-24 23-26-2 14-10 23-23 26Z" />
          <path d="M110 52c2-14 12-21 26-20-4 13-13 20-26 20Z" />
          <path d="M48 102c14-6 27-3 34 8-14 4-26 0-34-8Z" />
          <path d="M74 88c15-3 26 3 31 15-15 1-25-5-31-15Z" />
          <path d="M100 72c15 0 25 8 27 21-15-2-24-9-27-21Z" />
          <circle cx="156" cy="16" r="4" />
          <circle cx="166" cy="26" r="2.5" />
        </svg>
      )
    case 'divider':
      return (
        <svg {...common} viewBox="0 0 200 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M4 10h76M120 10h76" />
          <path d="M100 2c4 4 4 12 0 16-4-4-4-12 0-16Z" />
          <circle cx="88" cy="10" r="2" />
          <circle cx="112" cy="10" r="2" />
        </svg>
      )
    case 'stars':
      return (
        <svg {...common} viewBox="0 0 120 120" fill="currentColor">
          <path d="M20 14l2.4 6.6L29 23l-6.6 2.4L20 32l-2.4-6.6L11 23l6.6-2.4z" />
          <path d="M92 28l1.6 4.4L98 34l-4.4 1.6L92 40l-1.6-4.4L86 34l4.4-1.6z" />
          <path d="M70 92l2 5.5 5.5 2-5.5 2L70 107l-2-5.5-5.5-2 5.5-2z" />
          <circle cx="50" cy="40" r="1.6" />
          <circle cx="104" cy="76" r="1.4" />
          <circle cx="16" cy="78" r="1.2" />
        </svg>
      )
    case 'confetti':
      return (
        <svg {...common} viewBox="0 0 300 160">
          <rect x="18" y="20" width="14" height="6" rx="3" fill="#f472b6" transform="rotate(-25 25 23)" />
          <rect x="250" y="30" width="16" height="6" rx="3" fill="#38bdf8" transform="rotate(30 258 33)" />
          <rect x="140" y="8" width="12" height="5" rx="2.5" fill="#facc15" transform="rotate(15 146 10)" />
          <rect x="60" y="128" width="16" height="6" rx="3" fill="#a78bfa" transform="rotate(40 68 131)" />
          <rect x="220" y="120" width="12" height="5" rx="2.5" fill="#34d399" transform="rotate(-35 226 122)" />
          <circle cx="96" cy="40" r="5" fill="#facc15" />
          <circle cx="200" cy="70" r="4" fill="#f472b6" />
          <circle cx="40" cy="80" r="3.5" fill="#38bdf8" />
          <circle cx="280" cy="90" r="5" fill="#a78bfa" />
          <path d="M170 140c6-8 14-8 20 0" stroke="#fb7185" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M110 100c5-7 12-7 17 0" stroke="#38bdf8" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      )
    case 'waves':
      return (
        <svg {...common} viewBox="0 0 240 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M2 8c20-8 40 8 60 0s40 8 60 0 40 8 60 0 40 8 56 0" />
          <path d="M2 18c20-8 40 8 60 0s40 8 60 0 40 8 60 0 40 8 56 0" opacity=".5" />
        </svg>
      )
    default:
      return null
  }
}
