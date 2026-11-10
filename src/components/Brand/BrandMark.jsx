import { useId } from 'react'

/**
 * The standalone MyLinnnk symbol: three connected arches ("nnn") — linked
 * pages and shared moments — with a single dot for the moment itself.
 * Matches public/favicon.svg. Rendered inline so gradients work everywhere.
 *
 * variant: 'light' (navy tile, for light backgrounds) | 'dark' (raised tile
 * with outline, for navy backgrounds)
 */
export default function BrandMark({ size = 36, variant = 'light', title, className = '' }) {
  const gradientId = `mlk-arch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const isDark = variant === 'dark'

  return (
    <svg
      className={`brand-mark ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="10" y1="0" x2="38" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      {isDark ? (
        <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="12.25" fill="#13244A" stroke="#2A3B63" strokeWidth="1.5" />
      ) : (
        <rect width="48" height="48" rx="13" fill="#0A1630" />
      )}
      <path
        className="brand-mark__arches"
        d="M11 35V22.5a4.33 4.33 0 0 1 8.67 0V35M19.67 22.5a4.33 4.33 0 0 1 8.66 0V35M28.33 22.5a4.33 4.33 0 0 1 8.67 0V35"
        stroke={`url(#${gradientId})`}
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="brand-mark__dot" cx="37" cy="11.5" r="3" fill="#2DD4BF" />
    </svg>
  )
}
