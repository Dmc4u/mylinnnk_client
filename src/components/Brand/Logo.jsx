import BrandMark from './BrandMark.jsx'
import './Logo.css'

/**
 * Symbol + "MyLinnnk" wordmark, set in Inter so it matches the app type.
 * variant: 'light' for light backgrounds, 'dark' for navy backgrounds.
 */
export default function Logo({ variant = 'light', size = 36, className = '' }) {
  return (
    <span className={`logo logo--${variant} ${className}`.trim()}>
      <BrandMark size={size} variant={variant} />
      <span className="logo__word" style={{ '--logo-size': `${size}px` }}>
        MyLi<span className="logo__nnn">nnn</span>k
      </span>
    </span>
  )
}
