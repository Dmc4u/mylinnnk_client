/**
 * Client for the MyLinnnk API's /api/v1/auth endpoints.
 *
 * - Authentication is the API's HttpOnly session cookie, sent with
 *   `credentials: 'include'`. This code never sees or stores the session token.
 * - Signed-in state-changing requests send the session's CSRF token in the
 *   X-CSRF-Token header. The token is held in memory only (see AuthProvider),
 *   never in localStorage or sessionStorage.
 * - Every failure becomes an ApiError with a stable `code`, so the UI can
 *   react to it without parsing messages. Request bodies and one-time tokens
 *   are never logged or put into error messages.
 *
 * In development Vite proxies /api to the API on port 3003 (vite.config.js),
 * so the browser talks to a single origin.
 */

export const API_BASE = '/api/v1'
const REQUEST_TIMEOUT_MS = 15000

export const OFFLINE_MESSAGE = 'We couldn’t reach MyLinnnk. Check your connection and try again.'
export const UNAVAILABLE_MESSAGE = 'MyLinnnk is temporarily unavailable. Please try again in a moment.'

export class ApiError extends Error {
  constructor({ status = 0, code = 'API_UNAVAILABLE', message = UNAVAILABLE_MESSAGE, details, requestId } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = Array.isArray(details) ? details : undefined
    this.requestId = requestId
  }

  /** True when the API could not be reached or answered with something unusable. */
  get isUnavailable() {
    return this.status === 0 || this.code === 'API_UNAVAILABLE' || this.code === 'SERVICE_UNAVAILABLE' || this.code === 'INTERNAL_ERROR'
  }
}

/**
 * Sends one request and returns the `data` of a `{ data }` response.
 * Throws ApiError for `{ error }` responses, network failures, timeouts and
 * responses that aren't the API's JSON (for example a proxy error page).
 */
export async function apiRequest(path, { method = 'GET', body, csrfToken, headers: extraHeaders = {} } = {}) {
  const headers = { Accept: 'application/json', ...extraHeaders }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (error) {
    throw new ApiError({ status: 0, code: error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR', message: OFFLINE_MESSAGE })
  } finally {
    clearTimeout(timer)
  }

  let payload = null
  if ((response.headers.get('content-type') ?? '').includes('application/json')) {
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
  }

  if (response.ok && payload && 'data' in payload) return payload.data
  if (!response.ok && payload?.error?.code) {
    const { code, message, details, requestId } = payload.error
    throw new ApiError({ status: response.status, code, message: message || UNAVAILABLE_MESSAGE, details, requestId })
  }
  throw new ApiError({ status: response.status, code: 'API_UNAVAILABLE', message: UNAVAILABLE_MESSAGE })
}

const post = (path, body = {}, csrfToken) => apiRequest(path, { method: 'POST', body, csrfToken })

export const authApi = {
  /** → { authenticated, user, csrfToken } */
  getSession: () => apiRequest('/auth/session'),
  /** → { user, csrfToken, verificationEmailSent } */
  register: ({ email, password, displayName }) => post('/auth/register', { email, password, displayName }),
  /** → { user, csrfToken } */
  login: ({ email, password }) => post('/auth/login', { email, password }),
  /** → { loggedOut: true } (signed in + CSRF) */
  logout: (csrfToken) => post('/auth/logout', {}, csrfToken),
  /** → { verified: true, user } */
  verifyEmail: (token) => post('/auth/verify-email', { token }),
  /** → { sent, alreadyVerified } (signed in + CSRF) */
  resendVerification: (csrfToken) => post('/auth/resend-verification', {}, csrfToken),
  /** → { message } (same answer whether or not the account exists) */
  forgotPassword: (email) => post('/auth/forgot-password', { email }),
  /** → { passwordReset: true } (the API signs the user out everywhere) */
  resetPassword: ({ token, password }) => post('/auth/reset-password', { token, password }),
}
