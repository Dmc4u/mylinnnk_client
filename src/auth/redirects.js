/**
 * Where to go after logging in or signing up. Only same-site paths are
 * accepted, so a crafted link like /login?next=https://evil.example can't
 * send people elsewhere.
 */
export const DEFAULT_AFTER_AUTH = '/account'

export function safeNextPath(value, fallback = DEFAULT_AFTER_AUTH) {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\\]/.test(next)) return fallback
  // Never bounce back into an auth screen.
  if (/^\/(login|signup|forgot-password|reset-password|verify-email)(\/|\?|#|$)/.test(next)) return fallback
  return next
}

/** Builds /login?next=… (or /signup?next=…) for the current location. */
export function authHref(page, next) {
  const safe = safeNextPath(next, '')
  return safe ? `/${page}?next=${encodeURIComponent(safe)}` : `/${page}`
}
