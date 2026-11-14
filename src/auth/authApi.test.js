import { describe, expect, it, vi } from 'vitest'
import { ApiError, OFFLINE_MESSAGE, UNAVAILABLE_MESSAGE, apiRequest, authApi } from './authApi.js'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'

function withFakeApi() {
  const api = createFakeAuthApi()
  vi.stubGlobal('fetch', vi.fn(api.fetch))
  return api
}

describe('authApi requests', () => {
  it('sends cookies, JSON and no CSRF header on public endpoints', async () => {
    const api = withFakeApi()
    await authApi.forgotPassword('ana@example.com')
    const [request] = api.state.requests
    expect(request).toMatchObject({ method: 'POST', path: '/auth/forgot-password', credentials: 'include', body: { email: 'ana@example.com' } })
    expect(request.url).toBe('/api/v1/auth/forgot-password')
    expect(request.headers['Content-Type']).toBe('application/json')
    expect(request.headers.Accept).toBe('application/json')
    expect(request.headers).not.toHaveProperty('X-CSRF-Token')
  })

  it('maps every endpoint to the API contract', async () => {
    const api = withFakeApi()
    const ana = api.addUser({ email: 'ana@example.com' })
    expect(await authApi.getSession()).toEqual({ authenticated: false, user: null, isAdmin: false, csrfToken: null })

    const login = await authApi.login({ email: 'ana@example.com', password: 'correct horse battery' })
    expect(login.user).toMatchObject({ id: ana.id, email: 'ana@example.com' })
    expect(login.csrfToken).toHaveLength(43)

    const resent = await authApi.resendVerification(login.csrfToken)
    expect(resent).toMatchObject({ sent: true, alreadyVerified: false, verification: { pending: true, attemptsLeft: 5 } })
    expect(await authApi.getVerification()).toMatchObject({ verified: false, pending: true, expiresIn: 600, resendAfter: 60 })
    const code = api.lastEmail('email_verification_code').code
    expect(await authApi.verifyEmailCode(code, login.csrfToken)).toMatchObject({ verified: true, user: { emailVerified: true } })
    await authApi.verifyEmail(api.issueToken(ana, 'email_verification')) // links sent before codes still work
    await authApi.logout(login.csrfToken)

    expect(api.state.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /auth/session',
      'POST /auth/login',
      'POST /auth/resend-verification',
      'GET /auth/verification',
      'POST /auth/verify-email-code',
      'POST /auth/verify-email',
      'POST /auth/logout',
    ])
    const codeRequest = api.requestsTo('/auth/verify-email-code')[0]
    expect(codeRequest.body).toEqual({ code })
    expect(codeRequest.headers['X-CSRF-Token']).toBe(login.csrfToken)
    expect(codeRequest.url).not.toContain(code)
    expect(api.state.requests.every((r) => r.credentials === 'include')).toBe(true)
  })

  it('sends the CSRF token only in the X-CSRF-Token header', async () => {
    const api = withFakeApi()
    await authApi.logout('c'.repeat(43)).catch(() => {}) // no session: 401, we only check the request
    const [request] = api.state.requests
    expect(request.headers['X-CSRF-Token']).toBe('c'.repeat(43))
    expect(request.body).toEqual({})
    expect(request.url).not.toContain('c'.repeat(43))
  })
})

describe('authApi errors', () => {
  it('turns { error } responses into ApiError with code, status, details and requestId', async () => {
    withFakeApi()
    const error = await authApi.register({ email: 'bad', password: 'short', displayName: '' }).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', requestId: 'req-test-1' })
    expect(error.details.map((d) => d.path).sort()).toEqual(['displayName', 'email', 'password'])
  })

  it('reports network failures without exposing request data', async () => {
    const api = withFakeApi()
    api.state.down = true
    const error = await authApi.login({ email: 'ana@example.com', password: 'my secret password' }).catch((e) => e)
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR', message: OFFLINE_MESSAGE })
    expect(error.isUnavailable).toBe(true)
    expect(JSON.stringify({ ...error, message: error.message })).not.toContain('my secret password')
  })

  it('treats non-JSON answers (proxy errors while the API is down) as unavailable', async () => {
    const api = withFakeApi()
    api.state.proxyError = true
    const error = await authApi.getSession().catch((e) => e)
    expect(error).toMatchObject({ status: 502, code: 'API_UNAVAILABLE', message: UNAVAILABLE_MESSAGE })
    expect(error.isUnavailable).toBe(true)
  })

  it('times out hung requests', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn((_url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))),
      )
      const pending = apiRequest('/auth/session').catch((e) => e)
      await vi.advanceTimersByTimeAsync(16000)
      expect(await pending).toMatchObject({ code: 'TIMEOUT', message: OFFLINE_MESSAGE })
    } finally {
      vi.useRealTimers()
    }
  })
})
