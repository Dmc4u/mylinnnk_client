import './Button.css'

/**
 * Link-styled button. variant: 'primary' (glowing gradient CTA) | 'ghost'.
 * size: 'md' | 'sm'.
 */
export default function Button({ href = '#', variant = 'primary', size = 'md', className = '', children, ...rest }) {
  return (
    <a href={href} className={`btn btn--${variant} btn--${size} ${className}`.trim()} {...rest}>
      <span className="btn__label">{children}</span>
      {variant === 'primary' && (
        <svg className="btn__arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </a>
  )
}
