/**
 * In-memory stand-in for the MyLinnnk API's /api/v1/auth endpoints, used as
 * `fetch` in tests. It follows the real contract (mylinnnk_api, Stage 2):
 * { data } / { error: { code, message, details?, requestId } }, an HttpOnly
 * session the client can't see, and a CSRF token required by logout and
 * resend-verification. Every request is recorded for assertions.
 */
export const TOKEN_LENGTH = 43
const token = (seed) => `${seed}`.replace(/[^A-Za-z0-9_-]/g, '').padEnd(TOKEN_LENGTH, 'x').slice(0, TOKEN_LENGTH)

export function createFakeAuthApi() {
  let nextUserId = 1
  const state = {
    users: [],
    session: null, // { userId, csrfToken } — the browser's cookie, invisible to the app
    tokens: new Map(), // raw token → { type, userId, used, expired }
    requests: [],
    down: false, // network failure (fetch rejects)
    proxyError: false, // non-JSON 502, like Vite's proxy when the API is stopped
    rateLimited: false,
    sessionDelay: 0,
    emails: [],
  }

  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const ok = (data, status = 200) => json(status, { data })
  const fail = (status, code, message, details) => json(status, { error: { code, message, ...(details ? { details } : {}), requestId: 'req-test-1' } })

  const publicUser = (u) => ({ id: u.id, email: u.email, displayName: u.displayName, emailVerified: u.emailVerified, createdAt: '2026-11-01T10:00:00.000Z' })
  const currentUser = () => (state.session ? state.users.find((u) => u.id === state.session.userId) : null)

  function addUser({ email, password = 'correct horse battery', displayName = 'Ana', emailVerified = false }) {
    const user = { id: `user${nextUserId++}`, email, password, displayName, emailVerified }
    state.users.push(user)
    return user
  }

  function signIn(user) {
    state.session = { userId: user.id, csrfToken: token(`csrf${user.id}${Math.random().toString(36).slice(2)}`) }
    return state.session.csrfToken
  }

  function issueToken(user, type) {
    for (const [, t] of state.tokens) if (t.userId === user.id && t.type === type) t.used = true
    const raw = token(`${type}${user.id}${state.tokens.size}`)
    state.tokens.set(raw, { type, userId: user.id, used: false, expired: false })
    state.emails.push({ to: user.email, type, token: raw })
    return raw
  }

  function consume(raw, type) {
    const t = state.tokens.get(raw)
    if (!t || t.type !== type || t.used || t.expired) return null
    t.used = true
    return t
  }

  const requireSession = (headers) => {
    if (!currentUser()) return fail(401, 'UNAUTHENTICATED', 'You need to sign in.')
    if (headers['X-CSRF-Token'] !== state.session.csrfToken) {
      return fail(403, 'CSRF_INVALID', 'Your security token is missing or out of date. Refresh the page and try again.')
    }
    return null
  }

  const routes = {
    'GET /auth/session': async () => {
      // The answer reflects the moment the request arrived, even if it is delivered late.
      const user = currentUser()
      const response = ok(user ? { authenticated: true, user: publicUser(user), csrfToken: state.session.csrfToken } : { authenticated: false, user: null, csrfToken: null })
      if (state.sessionDelay) await new Promise((r) => setTimeout(r, state.sessionDelay))
      return response
    },
    'POST /auth/register': ({ body }) => {
      const details = []
      if (!body.displayName) details.push({ location: 'body', path: 'displayName', message: '"displayName" is required' })
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email ?? '')) details.push({ location: 'body', path: 'email', message: '"email" must be a valid email' })
      if ((body.password ?? '').length < 10) details.push({ location: 'body', path: 'password', message: 'Password must be at least 10 characters.' })
      if (details.length) return fail(400, 'VALIDATION_FAILED', 'The request is invalid.', details)
      const email = body.email.toLowerCase()
      if (state.users.some((u) => u.email === email)) {
        return fail(409, 'EMAIL_UNAVAILABLE', 'We couldn’t create an account with this email. If you already have an account, log in or reset your password.')
      }
      const user = addUser({ email, password: body.password, displayName: body.displayName })
      const csrfToken = signIn(user)
      issueToken(user, 'email_verification')
      return ok({ user: publicUser(user), csrfToken, verificationEmailSent: true }, 201)
    },
    'POST /auth/login': ({ body }) => {
      if (state.rateLimited) return fail(429, 'RATE_LIMITED', 'Too many attempts. Please wait a little and try again.')
      const user = state.users.find((u) => u.email === String(body.email).toLowerCase())
      if (!user || user.password !== body.password) return fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
      const csrfToken = signIn(user)
      return ok({ user: publicUser(user), csrfToken })
    },
    'POST /auth/logout': ({ headers }) => {
      const denied = requireSession(headers)
      if (denied) return denied
      state.session = null
      return ok({ loggedOut: true })
    },
    'POST /auth/verify-email': ({ body }) => {
      const t = consume(body.token, 'email_verification')
      if (!t) return fail(400, 'INVALID_TOKEN', 'This link is invalid or has expired. Please request a new one.')
      const user = state.users.find((u) => u.id === t.userId)
      user.emailVerified = true
      return ok({ verified: true, user: publicUser(user) })
    },
    'POST /auth/resend-verification': ({ headers }) => {
      const denied = requireSession(headers)
      if (denied) return denied
      const user = currentUser()
      if (user.emailVerified) return ok({ sent: false, alreadyVerified: true })
      issueToken(user, 'email_verification')
      return ok({ sent: true, alreadyVerified: false }, 202)
    },
    'POST /auth/forgot-password': ({ body }) => {
      const user = state.users.find((u) => u.email === String(body.email).toLowerCase())
      if (user) issueToken(user, 'password_reset')
      return ok({ message: 'If an account exists for that email, we’ve sent a link to reset the password.' }, 202)
    },
    'POST /auth/reset-password': ({ body }) => {
      const t = consume(body.token, 'password_reset')
      if (!t) return fail(400, 'INVALID_TOKEN', 'This link is invalid or has expired. Please request a new one.')
      state.users.find((u) => u.id === t.userId).password = body.password
      state.session = null // the API revokes every session
      return ok({ passwordReset: true })
    },
  }

  async function fetch(url, init = {}) {
    const method = init.method ?? 'GET'
    const path = new URL(url, 'http://localhost').pathname.replace(/^\/api\/v1/, '')
    const headers = { ...(init.headers ?? {}) }
    const body = init.body ? JSON.parse(init.body) : undefined
    state.requests.push({ method, path, headers, body, credentials: init.credentials, url })
    if (state.down) throw new TypeError('Failed to fetch')
    if (state.proxyError) return new Response('Bad gateway', { status: 502, headers: { 'content-type': 'text/plain' } })
    const handler = routes[`${method} ${path}`]
    if (!handler) return fail(404, 'NOT_FOUND', `No route for ${method} ${path}.`)
    return handler({ headers, body: body ?? {} })
  }

  return {
    fetch,
    state,
    addUser,
    signIn,
    issueToken,
    /** The server-side session ends (expiry, revocation) without the client knowing. */
    expireSession: () => {
      state.session = null
    },
    requestsTo: (path) => state.requests.filter((r) => r.path === path),
    lastEmail: (type) => [...state.emails].reverse().find((e) => e.type === type),
  }
}
