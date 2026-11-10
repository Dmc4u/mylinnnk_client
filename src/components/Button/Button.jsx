import { Link } from 'react-router'
import './Button.css'

/**
 * Link-styled button. Pass `to` for in-app routes (React Router) or `href`
 * for plain anchors. variant: 'primary' (glowing gradient CTA) | 'ghost'.
 * size: 'md' | 'sm'.
 */
export default function Button({ to, href = '#', variant = 'primary', size = 'md', className = '', children, ...rest }) {
  const classes = `btn btn--${variant} btn--${size} ${className}`.trim()
  const inner = (
    <>
      <span className="btn__label">{children}</span>
      {variant === 'primary' && (
        <svg className="btn__arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {inner}
      </Link>
    )
  }

  return (
    <a href={href} className={classes} {...rest}>
      {inner}
    </a>
  )
}
