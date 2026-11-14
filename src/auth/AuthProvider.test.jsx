import { StrictMode } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AuthProvider, { REVALIDATE_AFTER_MS } from './AuthProvider.jsx'
import { useAuth } from './useAuth.js'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'

const PASSWORD = 'correct horse battery'

/** Renders one "tab": an AuthProvider plus a probe exposing its state and actions. */
function renderTab(testId = 'tab') {
  const handle = {}
  function Probe() {
    Object.assign(handle, useAuth())
    return <p data-testid={testId}>{[handle.status, handle.user?.email ?? '-', handle.notice ?? '-'].join('|')}</p>
  }
  render(
    <StrictMode>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </StrictMode>,
  )
  return { auth: handle, text: () => screen.getByTestId(testId).textContent }
}

function setup() {
  const api = createFakeAuthApi()
  vi.stubGlobal('fetch', vi.fn(api.fetch))
  return api
}

describe('session restoration', () => {
  it('restores a signed-in session on page load with a single request (StrictMode)', async () => {
    const api = setup()
    api.signIn(api.addUser({ email: 'ana@example.com' }))
    const tab = renderTab()
    expect(tab.text()).toBe('loading|-|-')
    await waitFor(() => expect(tab.text()).toBe('authenticated|ana@example.com|-'))
    expect(api.requestsTo('/auth/session')).toHaveLength(1)
  })

  it('starts signed out when there is no session', async () => {
    setup()
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toBe('anonymous|-|-'))
  })

  it('reports an unreachable API as "unavailable" and recovers on retry', async () => {
    const api = setup()
    api.state.down = true
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toBe('unavailable|-|-'))
    api.state.down = false
    api.signIn(api.addUser({ email: 'ana@example.com' }))
    await act(() => tab.auth.refreshSession())
    expect(tab.text()).toBe('authenticated|ana@example.com|-')
  })

  it('keeps a known session through a temporary outage', async () => {
    const api = setup()
    api.signIn(api.addUser({ email: 'ana@example.com' }))
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toMatch(/^authenticated/))
    api.state.proxyError = true
    await act(() => tab.auth.refreshSession())
    expect(tab.text()).toBe('authenticated|ana@example.com|-')
  })
})

describe('login, logout and CSRF', () => {
  it('logs in, then sends that session’s CSRF token on logout and clears the user', async () => {
    const api = setup()
    api.addUser({ email: 'ana@example.com' })
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toBe('anonymous|-|-'))

    await act(() => tab.auth.login({ email: 'ana@example.com', password: PASSWORD }))
    expect(tab.text()).toBe('authenticated|ana@example.com|-')
    const csrfToken = api.state.session.csrfToken

    await act(() => tab.auth.logout())
    expect(tab.text()).toBe('anonymous|-|signed-out')
    expect(api.requestsTo('/auth/logout')[0].headers['X-CSRF-Token']).toBe(csrfToken)
    expect(api.state.session).toBeNull()
  })

  it('surfaces login errors without changing state', async () => {
    const api = setup()
    api.addUser({ email: 'ana@example.com' })
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toBe('anonymous|-|-'))
    await expect(tab.auth.login({ email: 'ana@example.com', password: 'wrong password' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(tab.text()).toBe('anonymous|-|-')
  })

  it('finishes logout locally when the server session had already ended', async () => {
    const api = setup()
    api.signIn(api.addUser({ email: 'ana@example.com' }))
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toMatch(/^authenticated/))
    api.expireSession()
    await act(() => tab.auth.logout())
    expect(tab.text()).toBe('anonymous|-|signed-out')
  })

  it('keeps the user signed in if logout fails because the API is unreachable', async () => {
    const api = setup()
    api.signIn(api.addUser({ email: 'ana@example.com' }))
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toMatch(/^authenticated/))
    api.state.down = true
    await expect(tab.auth.logout()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(tab.text()).toBe('authenticated|ana@example.com|-')
  })

  it('re-reads the session and retries once when the CSRF token is stale (same user)', async () => {
    const api = setup()
    const ana = api.addUser({ email: 'ana@example.com' })
    api.signIn(ana)
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toMatch(/^authenticated/))
    api.signIn(ana) // e.g. logged in again in another tab: new session, new CSRF token
    const result = await act(() => tab.auth.resendVerification())
    expect(result).toEqual({ sent: true, alreadyVerified: false })
    const calls = api.state.requests.map((r) => `${r.method} ${r.path}`)
    expect(calls.slice(-3)).toEqual(['POST /auth/resend-verification', 'GET /auth/session', 'POST /auth/resend-verification'])
  })

  it('never retries an action for a different user who signed in elsewhere', async () => {
    const api = setup()
    api.signIn(api.addUser({ email: 'ana@example.com' }))
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toMatch(/ana@example.com/))
    api.signIn(api.addUser({ email: 'ben@example.com' }))
    await expect(tab.auth.resendVerification()).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
    expect(api.requestsTo('/auth/resend-verification')).toHaveLength(1)
    await waitFor(() => expect(tab.text()).toBe('authenticated|ben@example.com|-'))
  })
})

describe('expired sessions', () => {
  it('a 401 on a signed-in action signs out with an "expired" notice', async () => {
    const api = setup()
    api.signIn(api.addUser({ email: 'ana@example.com' }))
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toMatch(/^authenticated/))
    api.state.session = { userId: 'gone', csrfToken: 'x' } // server no longer knows this session
    await expect(tab.auth.resendVerification()).rejects.toMatchObject({ status: 401 })
    await waitFor(() => expect(tab.text()).toBe('anonymous|-|expired'))
  })

  it('notices an expired session when the tab becomes visible again after a while', async () => {
    const api = setup()
    api.signIn(api.addUser({ email: 'ana@example.com' }))
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toMatch(/^authenticated/))
    api.expireSession()

    document.dispatchEvent(new Event('visibilitychange'))
    expect(api.requestsTo('/auth/session')).toHaveLength(1) // checked moments ago: no extra request

    const later = Date.now() + REVALIDATE_AFTER_MS + 1000
    vi.spyOn(Date, 'now').mockReturnValue(later)
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(tab.text()).toBe('anonymous|-|expired'))
  })

  it('re-checks when a page is restored from the back/forward cache', async () => {
    const api = setup()
    api.signIn(api.addUser({ email: 'ana@example.com' }))
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toMatch(/^authenticated/))
    api.expireSession()
    const event = new Event('pageshow')
    Object.defineProperty(event, 'persisted', { value: true })
    window.dispatchEvent(event)
    await waitFor(() => expect(tab.text()).toBe('anonymous|-|expired'))
  })
})

describe('no leaks between users', () => {
  it('ignores a slow session response that arrives after a newer login', async () => {
    const api = setup()
    api.addUser({ email: 'ana@example.com' })
    api.state.sessionDelay = 80
    const tab = renderTab()
    await act(() => tab.auth.login({ email: 'ana@example.com', password: PASSWORD }))
    expect(tab.text()).toBe('authenticated|ana@example.com|-')
    await act(() => new Promise((r) => setTimeout(r, 150))) // the stale "signed out" answer lands now
    expect(tab.text()).toBe('authenticated|ana@example.com|-')
  })

  it('switching accounts replaces the whole user, never merging the previous one', async () => {
    const api = setup()
    api.addUser({ email: 'ana@example.com', displayName: 'Ana', emailVerified: true })
    api.addUser({ email: 'ben@example.com', displayName: 'Ben' })
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toBe('anonymous|-|-'))
    await act(() => tab.auth.login({ email: 'ana@example.com', password: PASSWORD }))
    await act(() => tab.auth.logout())
    await act(() => tab.auth.login({ email: 'ben@example.com', password: PASSWORD }))
    expect(tab.auth.user).toEqual({ id: 'user2', email: 'ben@example.com', displayName: 'Ben', emailVerified: false, createdAt: expect.any(String) })
    expect(tab.auth.notice).toBeNull()
  })

  it('never writes session or CSRF tokens to web storage', async () => {
    const api = setup()
    api.addUser({ email: 'ana@example.com' })
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const tab = renderTab()
    await waitFor(() => expect(tab.text()).toBe('anonymous|-|-'))
    await act(() => tab.auth.login({ email: 'ana@example.com', password: PASSWORD }))
    const csrfToken = api.state.session.csrfToken
    await act(() => tab.auth.resendVerification())
    await act(() => tab.auth.logout())
    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(document.cookie).not.toContain(csrfToken)
    expect(JSON.stringify(tab.auth)).not.toContain(csrfToken)
  })
})

describe('several tabs', () => {
  it('a login or logout in one tab updates the other', async () => {
    const api = setup()
    api.addUser({ email: 'ana@example.com' })
    const tabA = renderTab('tab-a')
    const tabB = renderTab('tab-b')
    await waitFor(() => expect(tabB.text()).toBe('anonymous|-|-'))

    await act(() => tabA.auth.login({ email: 'ana@example.com', password: PASSWORD }))
    await waitFor(() => expect(tabB.text()).toBe('authenticated|ana@example.com|-'))

    await act(() => tabA.auth.logout())
    await waitFor(() => expect(tabB.text()).toBe('anonymous|-|signed-out'))
  })
})

describe('admin status (server-verified isAdmin)', () => {
  it('comes only from the server, and is cleared by sign-out, expiry and a switch to another account', async () => {
    const api = setup()
    const admin = api.addUser({ email: 'support@dmclimited.net', password: PASSWORD, admin: true })
    api.addUser({ email: 'ana@example.com', password: PASSWORD })
    const tab = renderTab()
    await waitFor(() => expect(tab.auth.status).toBe('anonymous'))
    expect(tab.auth.isAdmin).toBe(false)

    expect((await act(() => tab.auth.login({ email: 'support@dmclimited.net', password: PASSWORD }))).isAdmin).toBe(true)
    expect(tab.auth.isAdmin).toBe(true)
    await act(() => tab.auth.logout())
    expect(tab.auth.isAdmin).toBe(false) // signed out

    await act(() => tab.auth.login({ email: 'support@dmclimited.net', password: PASSWORD }))
    api.expireSession()
    await act(() => tab.auth.refreshSession())
    expect(tab.auth.status).toBe('anonymous')
    expect(tab.auth.isAdmin).toBe(false) // expired or revoked

    await act(() => tab.auth.login({ email: 'support@dmclimited.net', password: PASSWORD }))
    expect((await act(() => tab.auth.login({ email: 'ana@example.com', password: PASSWORD }))).isAdmin).toBe(false)
    expect(tab.auth.isAdmin).toBe(false) // another account in the same tab

    api.signIn(admin)
    admin.admin = false // the server stops treating this account as the admin
    await act(() => tab.auth.refreshSession())
    expect(tab.auth.status).toBe('authenticated')
    expect(tab.auth.isAdmin).toBe(false) // re-read with every session check
  })
})
