import './NeonRingLoader.css'

/** Sizes: sm | md | lg. Modes: inline | centered | full-page.
 * Pass message for a visible label. Inline mode otherwise uses a screen-reader label,
 * which becomes visible for reduced motion. Container modes always show a label.
 */
export default function NeonRingLoader({ size = 'md', mode = 'inline', message, className = '' }) {
  const showMessage = Boolean(message) || mode !== 'inline'
  return (
    <span className={`neon-ring-loader neon-ring-loader--${size} neon-ring-loader--${mode} ${className}`.trim()} role="status" aria-live="polite" aria-atomic="true">
      <span className="neon-ring-loader__ring" aria-hidden="true" />
      <span className={`neon-ring-loader__message${showMessage ? '' : ' neon-ring-loader__message--sr-only'}`}>
        {message || 'Loading…'}
      </span>
    </span>
  )
}
