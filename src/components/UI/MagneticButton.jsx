import { Link } from 'react-router'
import './MagneticButton.css'

/** Native button, anchor or Router link. Variants: primary | secondary | navy.
 * Sizes: sm | md | lg. Loading disables activation and exposes a stable busy label.
 */
export default function MagneticButton({
  to, href, variant = 'primary', size = 'md', type = 'button', disabled = false,
  loading = false, loadingLabel = 'Loading…', className = '', children, onClick, ...rest
}) {
  const inactive = disabled || loading
  const classes = `magnetic-button magnetic-button--${variant} magnetic-button--${size} ${className}`.trim()
  const handleClick = (event) => {
    if (inactive) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    onClick?.(event)
  }
  const props = {
    ...rest,
    className: classes,
    onClick: handleClick,
    'aria-busy': loading || undefined,
    'aria-disabled': inactive || undefined,
  }
  const content = (
    <>
      <span className="magnetic-button__layer" aria-hidden="true" />
      <span className="magnetic-button__content">
        {loading && <span className="magnetic-button__spinner" aria-hidden="true" />}
        {loading ? loadingLabel : children}
      </span>
    </>
  )

  if (to || href !== undefined) {
    // An inactive anchor has no destination, including for context-menu navigation.
    if (inactive) return <a {...props} role="link" tabIndex={-1}>{content}</a>
    if (to) return <Link {...props} to={to}>{content}</Link>
    return <a {...props} href={href}>{content}</a>
  }
  return <button {...props} type={type} disabled={inactive}>{content}</button>
}
