/**
 * In-memory stand-in for the MyLinnnk API's /api/v1/auth endpoints, used as
 * `fetch` in tests. It follows the real contract (mylinnnk_api, Stage 2):
 * { data } / { error: { code, message, details?, requestId } }, an HttpOnly
 * session the client can't see, and a CSRF token required by logout,
 * resend-verification and verify-email-code. Email verification uses 6-digit
 * codes (10 minutes, 5 attempts, 60 s between codes), like the real API.
 * Every request is recorded for assertions.
 */
import PLANS_FIXTURE from './fixtures/plans.json'

export const TOKEN_LENGTH = 43
const token = (seed) => `${seed}`.replace(/[^A-Za-z0-9_-]/g, '').padEnd(TOKEN_LENGTH, 'x').slice(0, TOKEN_LENGTH)

export function createFakeAuthApi() {
  let nextUserId = 1
  const state = {
    users: [],
    session: null, // { userId, csrfToken } — the browser's cookie, invisible to the app
    tokens: new Map(), // raw token → { type, userId, used, expired }
    codes: new Map(), // userId → { code, attempts, expiresAt, lastSentAt } (email verification codes)
    resendCooldownMs: 60_000,
    requests: [],
    down: false, // network failure (fetch rejects)
    proxyError: false, // non-JSON 502, like Vite's proxy when the API is stopped
    rateLimited: false,
    sessionDelay: 0,
    emails: [],
    pages: [], // cloud drafts (Stage 4 contract, mylinnnk_api/routes/page.js)
    pagesDown: false, // only /pages fails (network error), the rest of the API works
    pageDelay: 0, // ms before /pages answers
    media: [], // account images (Stage 5 contract, mylinnnk_api/routes/media.js)
    mediaDown: false, // /media requests fail with a network error
    mediaDelay: 0, // ms before /media answers
    mediaFailures: 0, // the next N uploads answer 503 STORAGE_UNAVAILABLE
    plansDown: false, // GET /plans fails with a network error
    checkout: null, // GET /plans `checkout` override, e.g. { available: true, test: false } (the server's PAYMENTS_MODE)
    enquiries: [], // POST /enquiries bodies received (contact messages and quote requests)
    enquiryFailure: false, // POST /enquiries answers 503 (email delivery failed)
    orders: [], // GET /orders items (the customer's payment orders, newest first)
    publications: [], // GET /publications items (the server's owner view of each paid-for page)
    site: { origin: 'http://localhost:3002', local: true }, // the server's APP_URL, and whether it is local
    plansDelay: 0, // ms before GET /plans answers
    publicPages: {}, // slug → page (live), or { gone: true } (was live, not any more); anything else is 404
    publicDown: false, // /public requests fail with a network error
    activePageRequests: 0,
    maxConcurrentPageRequests: 0,
  }

  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const ok = (data, status = 200) => json(status, { data })
  const fail = (status, code, message, details) => json(status, { error: { code, message, ...(details ? { details } : {}), requestId: 'req-test-1' } })

  const publicUser = (u) => ({ id: u.id, email: u.email, displayName: u.displayName, emailVerified: u.emailVerified, createdAt: '2026-11-01T10:00:00.000Z' })
  const currentUser = () => (state.session ? state.users.find((u) => u.id === state.session.userId) : null)

  /** `admin: true` makes the account the admin as the real server would report it (isAdmin). */
  function addUser({ email, password = 'correct horse battery', displayName = 'Ana', emailVerified = false, admin = false }) {
    const user = { id: `user${nextUserId++}`, email, password, displayName, emailVerified, admin }
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

  const CODE_TTL_MS = 10 * 60 * 1000
  const MAX_ATTEMPTS = 5
  let codeSeq = 0
  /** Emails a new verification code (replacing the previous one). */
  function issueCode(user, { now = Date.now() } = {}) {
    const code = String(204816 + 7919 * codeSeq++).slice(-6).padStart(6, '0')
    state.codes.set(user.id, { code, attempts: 0, expiresAt: now + CODE_TTL_MS, lastSentAt: now })
    state.emails.push({ to: user.email, type: 'email_verification_code', code })
    return code
  }
  const seconds = (ms) => Math.max(0, Math.ceil(ms / 1000))
  function verificationState(user, now = Date.now()) {
    if (user.emailVerified) return { verified: true, pending: false, expiresIn: 0, resendAfter: 0, attemptsLeft: 0 }
    const c = state.codes.get(user.id)
    if (!c) return { verified: false, pending: false, expiresIn: 0, resendAfter: 0, attemptsLeft: 0 }
    const expiresIn = seconds(c.expiresAt - now)
    return { verified: false, pending: expiresIn > 0 && c.attempts < MAX_ATTEMPTS, expiresIn, resendAfter: seconds(c.lastSentAt + state.resendCooldownMs - now), attemptsLeft: MAX_ATTEMPTS - c.attempts }
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
      const response = ok(user ? { authenticated: true, user: publicUser(user), isAdmin: user.admin === true, csrfToken: state.session.csrfToken } : { authenticated: false, user: null, isAdmin: false, csrfToken: null })
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
      issueCode(user)
      return ok({ user: publicUser(user), csrfToken, verificationEmailSent: true, verification: verificationState(user) }, 201)
    },
    'POST /auth/login': ({ body }) => {
      if (state.rateLimited) return fail(429, 'RATE_LIMITED', 'Too many attempts. Please wait a little and try again.')
      const user = state.users.find((u) => u.email === String(body.email).toLowerCase())
      if (!user || user.password !== body.password) return fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
      const csrfToken = signIn(user)
      return ok({ user: publicUser(user), isAdmin: user.admin === true, csrfToken })
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
      state.codes.delete(user.id)
      return ok({ verified: true, user: publicUser(user) })
    },
    'POST /auth/verify-email-code': ({ headers, body }) => {
      const denied = requireSession(headers)
      if (denied) return denied
      if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
        return fail(400, 'VALIDATION_FAILED', 'The request is invalid.', [{ location: 'body', path: 'code', message: 'Enter the 6-digit code from the email.' }])
      }
      const user = currentUser()
      if (user.emailVerified) return ok({ verified: true, user: publicUser(user) })
      const c = state.codes.get(user.id)
      if (!c) return fail(400, 'NO_CODE', 'There is no active code. Ask for a new one.')
      if (c.attempts >= MAX_ATTEMPTS) return fail(400, 'TOO_MANY_ATTEMPTS', 'Too many incorrect attempts. Ask for a new code.', [{ attemptsLeft: 0 }])
      if (c.expiresAt <= Date.now()) return fail(400, 'CODE_EXPIRED', 'This code has expired. Ask for a new one.')
      c.attempts += 1
      if (body.code !== c.code) {
        const attemptsLeft = MAX_ATTEMPTS - c.attempts
        if (attemptsLeft === 0) return fail(400, 'TOO_MANY_ATTEMPTS', 'Too many incorrect attempts. Ask for a new code.', [{ attemptsLeft: 0 }])
        return fail(400, 'INVALID_CODE', `That code isn’t right. ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`, [{ attemptsLeft }])
      }
      user.emailVerified = true
      state.codes.delete(user.id)
      return ok({ verified: true, user: publicUser(user) })
    },
    'GET /auth/verification': () => {
      const user = currentUser()
      if (!user) return fail(401, 'UNAUTHENTICATED', 'You need to sign in.')
      return ok(verificationState(user))
    },
    'POST /auth/resend-verification': ({ headers }) => {
      const denied = requireSession(headers)
      if (denied) return denied
      const user = currentUser()
      if (user.emailVerified) return ok({ sent: false, alreadyVerified: true })
      const resendAfter = verificationState(user).resendAfter
      if (state.codes.has(user.id) && resendAfter > 0) {
        return fail(429, 'RESEND_COOLDOWN', `Please wait ${resendAfter} seconds before asking for another code.`, [{ retryAfter: resendAfter }])
      }
      issueCode(user)
      return ok({ sent: true, alreadyVerified: false, verification: verificationState(user) }, 202)
    },
    'POST /enquiries': ({ body }) => {
      // Like the API: emails the enquiry (recorded here) or answers 503 when delivery fails.
      if (state.enquiryFailure) return fail(503, 'EMAIL_DELIVERY_FAILED', 'We couldn’t send your message just now. Please try again in a moment, or email support@dmclimited.net.')
      if (!['contact', 'quote'].includes(body.type) || !body.email || typeof body.startedAt !== 'number') return fail(400, 'VALIDATION_FAILED', 'The request is invalid.', [{ location: 'body', path: 'email', message: 'is required' }])
      state.enquiries.push(structuredClone(body))
      return ok({ received: true, reference: `ENQ-TEST${String(state.enquiries.length).padStart(2, '0')}` }, 202)
    },
    'GET /orders': () => {
      if (!currentUser()) return fail(401, 'UNAUTHENTICATED', 'You need to sign in.')
      return ok({ orders: structuredClone(state.orders) })
    },
    'GET /publications': () => {
      if (!currentUser()) return fail(401, 'UNAUTHENTICATED', 'You need to sign in.')
      return ok({ publications: structuredClone(state.publications), site: { ...state.site } })
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

  /* ---------------- Cloud drafts (/pages) ---------------- */
  const EDITABLE = ['templateId', 'templateSlug', 'templateCategory', 'title', 'schemaVersion', 'theme', 'sections']
  const SERVER_MANAGED = ['id', '_id', 'owner', 'clientId', 'status', 'storage', 'revision', 'createdAt', 'updatedAt', 'deletedAt']
  const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v)
  const hashOf = (page) => JSON.stringify(sortKeys(Object.fromEntries(EDITABLE.map((k) => [k, page[k]]))))
  const mediaIdsOf = (page) => {
    const ids = new Set()
    const walk = (v) => {
      if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') {
        if (typeof v.mediaId === 'string') ids.add(v.mediaId)
        Object.values(v).forEach(walk)
      }
    }
    walk(page.sections)
    return [...ids].sort()
  }
  let pageSeq = 0
  const readyIds = (owner) => new Set(state.media.filter((m) => m.owner === owner).map((m) => m.mediaId))
  const pendingOf = (p) => p.mediaIds.filter((id) => !readyIds(p.owner).has(id))
  const summary = (p) => ({
    id: p.id, clientId: p.clientId, title: p.title, templateSlug: p.templateSlug, templateCategory: p.templateCategory,
    status: 'draft', revision: p.revision, mediaCount: p.mediaIds.length, pendingMediaCount: pendingOf(p).length, createdAt: p.createdAt, updatedAt: p.updatedAt,
  })
  const detail = (p) => ({
    ...summary(p),
    mediaIds: [...p.mediaIds],
    pendingMediaIds: pendingOf(p),
    page: { id: p.clientId, ...structuredClone(Object.fromEntries(EDITABLE.map((k) => [k, p[k]]))), status: 'draft', createdAt: p.createdAt, updatedAt: p.updatedAt },
  })
  const tick = () => new Date(Date.now() + pageSeq++).toISOString()
  const ifMatch = (headers) => {
    const raw = headers['If-Match']
    if (!raw) return null
    return Number(/^"?(\d+)"?$/.exec(raw)?.[1] ?? NaN)
  }
  const invalidPage = (page) => {
    if (!page || typeof page !== 'object') return [{ path: 'page', message: 'is required' }]
    const errors = Object.keys(page).filter((k) => SERVER_MANAGED.includes(k) || !EDITABLE.includes(k)).map((k) => ({ path: `page.${k}`, message: 'is not allowed' }))
    if (!Array.isArray(page.sections) || !page.sections.length) errors.push({ path: 'page.sections', message: 'is required' })
    return errors
  }
  const ownedPage = (id) => state.pages.find((p) => p.id === id && p.owner === state.session?.userId)

  function pagesRoute(method, path, headers, body) {
    if (state.pagesDown) throw new TypeError('Failed to fetch')
    if (!currentUser()) return fail(401, 'UNAUTHENTICATED', 'You need to sign in.')
    if (method !== 'GET' && headers['X-CSRF-Token'] !== state.session.csrfToken) {
      return fail(403, 'CSRF_INVALID', 'Your security token is missing or out of date. Refresh the page and try again.')
    }
    const owner = state.session.userId
    const id = path.split('/')[2]

    if (method === 'GET' && !id) {
      const list = state.pages.filter((p) => p.owner === owner && !p.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      return ok({ drafts: list.map(summary) })
    }
    if (method === 'POST' && !id) {
      const errors = invalidPage(body.page)
      if (!/^draft_[a-z0-9]{8,32}$/.test(body.clientId ?? '')) errors.push({ path: 'clientId', message: 'must be an editor draft id' })
      if (errors.length) return fail(400, 'INVALID_PAGE', 'The page content is invalid.', errors)
      const hash = hashOf(body.page)
      const existing = state.pages.find((p) => p.owner === owner && p.clientId === body.clientId)
      if (existing) {
        if (existing.deletedAt) return fail(410, 'DRAFT_DELETED', 'A draft with this id was deleted from your account.')
        if (existing.creationHash === hash) return ok({ created: false, draft: detail(existing) })
        return fail(409, 'CLIENT_ID_CONFLICT', 'Your account already has a different draft with this id.')
      }
      const now = tick()
      const draft = {
        id: `665f${String(1000000 + state.pages.length).padStart(20, '0')}`.slice(0, 24),
        owner, clientId: body.clientId, ...structuredClone(body.page), revision: 1, creationHash: hash, contentHash: hash,
        mediaIds: mediaIdsOf(body.page), deletedAt: null, createdAt: now, updatedAt: now,
      }
      state.pages.push(draft)
      return ok({ created: true, draft: detail(draft) }, 201)
    }
    const draft = ownedPage(id)
    if (!draft) return fail(404, 'NOT_FOUND', 'Draft not found.')
    if (method === 'GET') return draft.deletedAt ? fail(410, 'DRAFT_DELETED', 'This draft was deleted.') : ok({ draft: detail(draft) })

    const revision = ifMatch(headers)
    if (revision === null) return fail(428, 'REVISION_REQUIRED', 'Send the revision you edited as If-Match.')
    if (method === 'PATCH') {
      if (draft.deletedAt) return fail(410, 'DRAFT_DELETED', 'This draft was deleted.')
      const errors = invalidPage(body.page)
      if (errors.length) return fail(400, 'INVALID_PAGE', 'The page content is invalid.', errors)
      const hash = hashOf(body.page)
      if (hash === draft.contentHash) return ok({ draft: detail(draft) })
      if (revision !== draft.revision) {
        return fail(409, 'REVISION_CONFLICT', 'This draft was changed somewhere else since you opened it.', [{ path: 'revision', message: 'is out of date', currentRevision: draft.revision }])
      }
      Object.assign(draft, structuredClone(body.page), { revision: draft.revision + 1, contentHash: hash, mediaIds: mediaIdsOf(body.page), updatedAt: tick() })
      return ok({ draft: detail(draft) })
    }
    if (method === 'DELETE') {
      if (draft.deletedAt) return ok({ deleted: true, id: draft.id, deletedAt: draft.deletedAt })
      if (revision !== draft.revision) return fail(409, 'REVISION_CONFLICT', 'This draft was changed somewhere else since you opened it.')
      Object.assign(draft, { deletedAt: tick(), revision: draft.revision + 1 })
      return ok({ deleted: true, id: draft.id, deletedAt: draft.deletedAt })
    }
    return fail(404, 'NOT_FOUND', `No route for ${method} ${path}.`)
  }

  /* ---------------- Account images (/media) ---------------- */
  const MEDIA_ID = /^media_[a-z0-9]{8,32}$/
  const mediaSummary = (m) => ({ mediaId: m.mediaId, contentType: 'image/webp', bytes: m.bytes, width: 10, height: 10, hasAlpha: false, createdAt: m.createdAt })

  async function mediaRoute(method, path, query, headers, body) {
    if (state.mediaDown) throw new TypeError('Failed to fetch')
    if (!currentUser()) return fail(401, 'UNAUTHENTICATED', 'You need to sign in.')
    if (method !== 'GET' && headers['X-CSRF-Token'] !== state.session.csrfToken) return fail(403, 'CSRF_INVALID', 'Your security token is missing or out of date.')
    const owner = state.session.userId
    const [, , mediaId, sub] = path.split('/')
    if (method === 'GET' && !mediaId) {
      const mine = state.media.filter((m) => m.owner === owner)
      if (query.get('ids')) {
        const ids = query.get('ids').split(',')
        const have = new Set(mine.map((m) => m.mediaId))
        return ok({ available: ids.filter((id) => have.has(id)), missing: ids.filter((id) => !have.has(id)) })
      }
      return ok({ media: mine.map(mediaSummary), usage: { bytes: mine.reduce((n, m) => n + m.bytes, 0), items: mine.length } })
    }
    if (!MEDIA_ID.test(mediaId ?? '')) return fail(400, 'VALIDATION_FAILED', 'The request is invalid.')
    const existing = state.media.find((m) => m.owner === owner && m.mediaId === mediaId)
    if (method === 'PUT') {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(headers['Content-Type'])) return fail(415, 'UNSUPPORTED_MEDIA_TYPE', 'Upload a JPEG, PNG or WebP image.')
      const bytes = typeof body?.text === 'function' ? await body.text() : String(body ?? '')
      if (state.mediaFailures > 0) {
        state.mediaFailures -= 1
        return fail(503, 'STORAGE_UNAVAILABLE', 'The image couldn’t be stored right now. Please try again.')
      }
      if (existing) {
        if (existing.hash !== bytes) return fail(409, 'MEDIA_ID_CONFLICT', 'A different image already uses this id.')
        return ok({ created: false, media: mediaSummary(existing) })
      }
      const media = { owner, mediaId, hash: bytes, bytes: bytes.length, createdAt: new Date().toISOString() }
      state.media.push(media)
      return ok({ created: true, media: mediaSummary(media) }, 201)
    }
    if (!existing) return fail(404, 'NOT_FOUND', 'Image not found.')
    if (method === 'GET' && sub === 'content') return new Response(existing.hash, { status: 200, headers: { 'content-type': 'image/webp', 'cache-control': 'private, no-cache' } })
    if (method === 'DELETE') {
      if (state.pages.some((p) => p.owner === owner && p.mediaIds.includes(mediaId))) return fail(409, 'MEDIA_IN_USE', 'This image is used by one of your drafts.')
      state.media = state.media.filter((m) => m !== existing)
      return ok({ deleted: true, mediaId })
    }
    return fail(404, 'NOT_FOUND', `No route for ${method} ${path}.`)
  }

  async function fetch(url, init = {}) {
    const method = init.method ?? 'GET'
    const path = new URL(url, 'http://localhost').pathname.replace(/^\/api\/v1/, '')
    const headers = { ...(init.headers ?? {}) }
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
    state.requests.push({ method, path, headers, body, credentials: init.credentials, url })
    if (state.down) throw new TypeError('Failed to fetch')
    if (state.proxyError) return new Response('Bad gateway', { status: 502, headers: { 'content-type': 'text/plain' } })
    if (path.startsWith('/public/pages/')) {
      // Published pages (mylinnnk_api/routes/publication.js): no session, read-only.
      if (state.publicDown) throw new TypeError('Failed to fetch')
      const slug = decodeURIComponent(path.slice('/public/pages/'.length))
      // Like the API's validator: an address is letters, digits and hyphens only.
      if (!/^[A-Za-z0-9-]+$/.test(slug)) return fail(400, 'VALIDATION_FAILED', 'The request is invalid.', [{ location: 'params', path: 'slug', message: 'fails to match the required pattern' }])
      const entry = method === 'GET' ? state.publicPages[slug] : undefined
      if (!entry) return fail(404, 'NOT_FOUND', 'Page not found.')
      if (entry.gone) return fail(410, 'PAGE_UNAVAILABLE', 'This page isn’t available right now.')
      return ok({ page: structuredClone(entry) })
    }
    if (path === '/plans/country') {
      // GET /plans/country: what a trusted edge proxy reported (state.visitorCountry), else null.
      const country = state.visitorCountry ?? null
      return ok({ country, source: country ? 'edge' : null })
    }
    if (path === '/plans') {
      // Public price list (mylinnnk_api/routes/plans.js); the fixture is the server's own output.
      if (state.plansDelay) await new Promise((r) => setTimeout(r, state.plansDelay))
      if (state.plansDown) throw new TypeError('Failed to fetch')
      if (method !== 'GET') return fail(404, 'NOT_FOUND', `No route for ${method} ${path}.`)
      const plans = structuredClone(PLANS_FIXTURE)
      if (state.checkout) plans.checkout = { ...state.checkout }
      // state.estimate = { ngnPerUsd, rates?: { CODE: per USD }, asOf, source? }: as the server answers
      // GET /plans?display=CODE with USD-based reference rates (mylinnnk_api/services/planService.js:
      // (kobo ÷ 100) ÷ NGN per USD × CODE per USD, rounded to the currency's minor unit). Like the
      // server, no rate is included in the response, and a currency without a rate gets no estimate.
      const code = new URL(url, 'http://localhost').searchParams.get('display') ?? 'USD'
      const digits = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits
      const shownCurrency = { code, minorUnit: 10 ** digits }
      plans.estimate = { available: false, currency: shownCurrency }
      if (state.estimate && code !== 'NGN') {
        const rates = state.estimate.rates ?? (state.estimate.source === 'manual' ? { USD: 1 } : { USD: 1, NGN: state.estimate.ngnPerUsd })
        const perUsd = rates[code]
        if (Number.isFinite(perUsd)) {
          plans.estimate = { available: true, currency: shownCurrency, asOf: state.estimate.asOf, source: state.estimate.source ?? 'exchangerate-api', rounding: 'nearest-minor-unit' }
          plans.plans = plans.plans.map((p) => ({ ...p, estimate: p.price ? { amountMinor: Math.round((p.price.amountMinor / 100 / state.estimate.ngnPerUsd) * perUsd * 10 ** digits) } : null }))
        }
      }
      return ok(plans)
    }
    if (path === '/media' || path.startsWith('/media/')) {
      if (state.mediaDelay) await new Promise((r) => setTimeout(r, state.mediaDelay))
      return mediaRoute(method, path, new URL(url, 'http://localhost').searchParams, headers, body)
    }
    if (path === '/pages' || path.startsWith('/pages/')) {
      // Concurrency is tracked for writes (saves), not for list/read requests.
      const isWrite = method !== 'GET'
      if (isWrite) {
        state.activePageRequests += 1
        state.maxConcurrentPageRequests = Math.max(state.maxConcurrentPageRequests, state.activePageRequests)
      }
      try {
        if (state.pageDelay) await new Promise((r) => setTimeout(r, state.pageDelay))
        return pagesRoute(method, path, headers, body ?? {})
      } finally {
        if (isWrite) state.activePageRequests -= 1
      }
    }
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
    issueCode,
    /** The code's timers move on, as if `ms` had passed (expiry and the resend cooldown). */
    ageCode: (user, ms) => {
      const c = state.codes.get(user.id)
      if (c) Object.assign(c, { expiresAt: c.expiresAt - ms, lastSentAt: c.lastSentAt - ms })
    },
    /** The server-side session ends (expiry, revocation) without the client knowing. */
    expireSession: () => {
      state.session = null
    },
    requestsTo: (path) => state.requests.filter((r) => r.path === path),
    pageRequests: () => state.requests.filter((r) => r.path === '/pages' || r.path.startsWith('/pages/')),
    mediaRequests: (method) => state.requests.filter((r) => (r.path === '/media' || r.path.startsWith('/media/')) && (!method || r.method === method)),
    /** An image already stored in the account (e.g. uploaded from another device). */
    seedMedia: (user, mediaId, hash = 'img') => state.media.push({ owner: user.id, mediaId, hash, bytes: hash.length, createdAt: new Date().toISOString() }),
    /** Stores a cloud draft directly (e.g. created on another device). */
    seedPage: (user, clientId, page) => {
      const now = tick()
      const hash = hashOf(page)
      const draft = {
        id: `665f${String(1000000 + state.pages.length).padStart(20, '0')}`.slice(0, 24),
        owner: user.id, clientId, ...structuredClone(Object.fromEntries(EDITABLE.map((k) => [k, page[k]]))), revision: 1,
        creationHash: hash, contentHash: hash, mediaIds: mediaIdsOf(page), deletedAt: null, createdAt: now, updatedAt: now,
      }
      state.pages.push(draft)
      return draft
    },
    /** Another device saves a change: new content, new revision. */
    editPageElsewhere: (id, mutate) => {
      const draft = state.pages.find((p) => p.id === id)
      mutate(draft)
      draft.revision += 1
      draft.contentHash = hashOf(draft)
      draft.updatedAt = tick()
      return draft
    },
    lastEmail: (type) => [...state.emails].reverse().find((e) => e.type === type),
  }
}
