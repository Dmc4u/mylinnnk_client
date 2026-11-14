/**
 * Where to go after logging in or signing up. Only same-site paths are
 * accepted, so a crafted link like /login?next=https://evil.example can't
 * send people elsewhere.
 */
export const DEFAULT_AFTER_AUTH = '/account'
/** Where the admin goes after logging in when no (safe) `next` path was given. */
export const ADMIN_HOME = '/admin'

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

/**
 * Public pages someone may simply have been browsing when they pressed "Log in" (the header always
 * passes the current page as `next`). For the admin these aren't a destination they asked for, so the
 * dashboard wins; every other safe path (an /admin page that asked for a fresh sign-in, the account,
 * orders, publishing, the editor) is kept.
 */
const BROWSING_PAGE = /^\/(?:templates(?:\/[^?#]*)?|pricing|p\/[^/?#]+)?\/?(?:[?#].*)?$/

/**
 * Where to go after a successful login. `isAdmin` must be the server's answer for this login.
 * - Ordinary users: exactly safeNextPath(next) (unchanged behaviour; default /account).
 * - The admin: the safe `next` path if it is an intentional destination, otherwise /admin.
 * Unsafe `next` values (other sites, auth screens, malformed) are never followed by anyone.
 */
export function afterLoginPath(next, { isAdmin = false } = {}) {
  if (!isAdmin) return safeNextPath(next)
  const safe = safeNextPath(next, '')
  return safe && !BROWSING_PAGE.test(safe) ? safe : ADMIN_HOME
}
