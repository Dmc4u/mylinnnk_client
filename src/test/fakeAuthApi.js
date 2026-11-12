/**
 * In-memory stand-in for the MyLinnnk API's /api/v1/auth endpoints, used as
 * `fetch` in tests. It follows the real contract (mylinnnk_api, Stage 2):
 * { data } / { error: { code, message, details?, requestId } }, an HttpOnly
 * session the client can't see, and a CSRF token required by logout and
 * resend-verification. Every request is recorded for assertions.
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
      const entry = method === 'GET' ? state.publicPages[slug] : undefined
      if (!entry) return fail(404, 'NOT_FOUND', 'Page not found.')
      if (entry.gone) return fail(410, 'PAGE_UNAVAILABLE', 'This page isn’t available right now.')
      return ok({ page: structuredClone(entry) })
    }
    if (path === '/plans') {
      // Public price list (mylinnnk_api/routes/plans.js); the fixture is the server's own output.
      if (state.plansDelay) await new Promise((r) => setTimeout(r, state.plansDelay))
      if (state.plansDown) throw new TypeError('Failed to fetch')
      return method === 'GET' ? ok(structuredClone(PLANS_FIXTURE)) : fail(404, 'NOT_FOUND', `No route for ${method} ${path}.`)
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
