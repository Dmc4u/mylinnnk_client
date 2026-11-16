/**
 * Admin login redirect and the "Admin Dashboard" link in the account menu. Whether someone is the admin
 * always comes from the server (isAdmin in /auth/login and /auth/session); the admin pages and APIs still
 * check every request on the server, which these tests model with the fake /admin/me below.
 */
import 'fake-indexeddb/auto'
import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { afterLoginPath } from '../auth/redirects.js'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

vi.setConfig({ testTimeout: 15000 })

const PASSWORD = 'correct horse battery'
const ADMIN_EMAIL = 'support@dmclimited.net'
// Navigation after login commits in a React transition; allow for a busy machine running the whole suite.
const NAV_WAIT = { timeout: 5000 }
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The fake API with one admin and one ordinary user; /admin/* answers like the real server (403 unless admin). */
function setup({ signedInAs = null } = {}) {
  const api = createFakeAuthApi()
  const admin = api.addUser({ email: ADMIN_EMAIL, password: PASSWORD, displayName: 'MyLink', emailVerified: true, admin: true })
  const ordinary = api.addUser({ email: 'ana@example.com', password: PASSWORD, displayName: 'Ana', emailVerified: true })
  const adminCalls = []
  const base = api.fetch
  api.fetch = async (url, init = {}) => {
    const path = new URL(url, 'http://localhost').pathname.replace(/^\/api\/v1/, '')
    if (!path.startsWith('/admin')) return base(url, init)
    adminCalls.push(path)
    const user = api.state.session ? api.state.users.find((u) => u.id === api.state.session.userId) : null
    if (!user) return json(401, { error: { code: 'UNAUTHENTICATED', message: 'You need to sign in.' } })
    if (!user.admin) return json(403, { error: { code: 'NOT_AN_ADMIN', message: 'You don’t have access to administration.' } })
    if (path === '/admin/me') return json(200, { data: { user: { id: user.id, displayName: user.displayName, email: user.email }, role: 'admin' } })
    if (path === '/admin/overview') return json(200, { data: { users: { total: 2, verified: 2 }, drafts: 0, publications: {}, orders: {}, awaitingReview: 0 } })
    return json(200, { data: { items: [], total: 0, page: 1, pageSize: 50 } })
  }
  if (signedInAs === 'admin') api.signIn(admin)
  if (signedInAs === 'ordinary') api.signIn(ordinary)
  return { api, admin, ordinary, adminCalls }
}

async function logIn(user, email) {
  await user.type(await screen.findByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), PASSWORD)
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

async function openAccountMenu(user, name) {
  const banner = await screen.findByRole('banner')
  await user.click(await within(banner).findByRole('button', { name: `Account menu for ${name}` }))
  return within(banner)
}

describe('after logging in', () => {
  it('the admin goes to /admin by default', async () => {
    const { api } = setup()
    const { user, location } = renderApp('/login', { api })
    await logIn(user, ADMIN_EMAIL)
    await waitFor(() => expect(location()).toBe('/admin'), NAV_WAIT)
    expect(await screen.findByRole('navigation', { name: 'Administration' })).toBeInTheDocument()
  })

  it('the admin goes to /admin after “Log in” from a public page (the header passes it as next)', async () => {
    const { api } = setup()
    const { user, location } = renderApp('/login?next=%2F', { api })
    await logIn(user, ADMIN_EMAIL)
    await waitFor(() => expect(location()).toBe('/admin'), NAV_WAIT)
  })

  it('an ordinary user follows the existing flow: their account by default', async () => {
    const { api, adminCalls } = setup()
    const { user, location } = renderApp('/login', { api })
    await logIn(user, 'ana@example.com')
    await waitFor(() => expect(location()).toBe('/dashboard'), NAV_WAIT)
    expect(adminCalls).toEqual([]) // no admin API is ever asked about an ordinary user
  })

  it('an ordinary user returns to the page they came from (existing flow)', async () => {
    const { api } = setup()
    const { user, location } = renderApp('/login?next=%2Ftemplates', { api })
    await logIn(user, 'ana@example.com')
    await waitFor(() => expect(location()).toBe('/templates'), NAV_WAIT)
  })

  it('an ordinary user sent to /admin still gets no access (the server decides)', async () => {
    const { api } = setup()
    const { user, location } = renderApp('/login?next=%2Fadmin', { api })
    await logIn(user, 'ana@example.com')
    await waitFor(() => expect(location()).toBe('/admin'), NAV_WAIT)
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Administration' })).not.toBeInTheDocument()
  })

  it('the admin returns to the admin page that asked for a fresh sign-in', async () => {
    const { api } = setup()
    const { user, location } = renderApp(`/login?next=${encodeURIComponent('/admin/payments?status=submitted')}`, { api })
    await logIn(user, ADMIN_EMAIL)
    await waitFor(() => expect(location()).toBe('/admin/payments?status=submitted'), NAV_WAIT)
  })
})

describe('return URLs (no open redirects)', () => {
  it('keeps intentional safe paths for the admin and sends browsing pages to the dashboard', () => {
    const admin = { isAdmin: true }
    for (const kept of ['/admin/payments/MLK-7Q4K-9XMD', '/account', '/orders/MLK-7Q4K-9XMD', '/publish/665f00000000000000000001', '/editor/garden-vows?draft=1']) {
      expect(afterLoginPath(kept, admin)).toBe(kept)
    }
    for (const browsing of [null, '', '/', '/?ref=x', '/templates', '/templates/garden-vows', '/pricing', '/p/ada-and-tunde']) {
      expect(afterLoginPath(browsing, admin)).toBe('/admin')
    }
  })

  it('never follows an unsafe next, for anyone', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/login', '/x\u0000y']) {
      expect(afterLoginPath(bad, { isAdmin: true })).toBe('/admin')
      expect(afterLoginPath(bad, { isAdmin: false })).toBe('/dashboard')
    }
  })

  it('leaves the ordinary user flow exactly as before', () => {
    expect(afterLoginPath('/', { isAdmin: false })).toBe('/')
    expect(afterLoginPath('/templates', { isAdmin: false })).toBe('/templates')
    expect(afterLoginPath(null, { isAdmin: false })).toBe('/dashboard')
    expect(afterLoginPath('/admin', { isAdmin: false })).toBe('/admin') // and the server refuses them there
  })
})

describe('account menu', () => {
  it('shows “Admin Dashboard” to the admin, and it opens /admin', async () => {
    const { api } = setup({ signedInAs: 'admin' })
    const { user, location } = renderApp('/', { api })
    const menu = await openAccountMenu(user, 'MyLink')
    await user.click(menu.getByRole('link', { name: 'Admin Dashboard' }))
    await waitFor(() => expect(location()).toBe('/admin'), NAV_WAIT)
    expect(await screen.findByRole('navigation', { name: 'Administration' })).toBeInTheDocument()
  })

  it('never shows it to an ordinary user, and never asks the admin API about them', async () => {
    const { api, adminCalls } = setup({ signedInAs: 'ordinary' })
    const { user } = renderApp('/', { api })
    const menu = await openAccountMenu(user, 'Ana')
    expect(menu.getByRole('link', { name: 'Account' })).toBeInTheDocument()
    expect(menu.queryByRole('link', { name: 'Admin Dashboard' })).not.toBeInTheDocument()
    expect(adminCalls).toEqual([])
  })

  it('is there after a page refresh (restored from the session), without an admin API call', async () => {
    const { api, adminCalls } = setup({ signedInAs: 'admin' })
    const { user } = renderApp('/templates', { api })
    const menu = await openAccountMenu(user, 'MyLink')
    expect(menu.getByRole('link', { name: 'Admin Dashboard' })).toHaveAttribute('href', '/admin')
    expect(adminCalls).toEqual([])
  })

  it('goes away on sign-out', async () => {
    const { api } = setup({ signedInAs: 'admin' })
    const { user } = renderApp('/', { api })
    let menu = await openAccountMenu(user, 'MyLink')
    await user.click(menu.getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(within(screen.getByRole('banner')).queryByRole('button', { name: /Account menu/ })).not.toBeInTheDocument())
    expect(screen.queryByRole('link', { name: 'Admin Dashboard' })).not.toBeInTheDocument()
    // Signing in again as an ordinary user in the same tab shows no admin link either.
    api.signIn(api.state.users.find((u) => u.email === 'ana@example.com'))
    await act(async () => {
      const event = new Event('pageshow')
      Object.defineProperty(event, 'persisted', { value: true })
      window.dispatchEvent(event)
    })
    menu = await openAccountMenu(user, 'Ana')
    expect(menu.queryByRole('link', { name: 'Admin Dashboard' })).not.toBeInTheDocument()
  })

  it('goes away when the session expires or is revoked; /admin then asks to sign in', async () => {
    const { api } = setup({ signedInAs: 'admin' })
    const { user } = renderApp('/', { api })
    await openAccountMenu(user, 'MyLink')
    expect(screen.getByRole('link', { name: 'Admin Dashboard' })).toBeInTheDocument()
    api.expireSession()
    await act(async () => {
      const event = new Event('pageshow')
      Object.defineProperty(event, 'persisted', { value: true })
      window.dispatchEvent(event)
    })
    await waitFor(() => expect(within(screen.getByRole('banner')).queryByRole('button', { name: /Account menu/ })).not.toBeInTheDocument())
    expect(screen.queryByRole('link', { name: 'Admin Dashboard' })).not.toBeInTheDocument()
  })

  it('goes away when the account stops being the admin (the server refuses /admin)', async () => {
    const { api, admin } = setup({ signedInAs: 'admin' })
    admin.admin = false // e.g. the designated admin email was changed on the server
    const { user } = renderApp('/admin', { api })
    // The page loaded with a session saying "admin"… then /admin/me says no; the session is re-read.
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
    const menu = await openAccountMenu(user, 'MyLink')
    await waitFor(() => expect(menu.queryByRole('link', { name: 'Admin Dashboard' })).not.toBeInTheDocument())
  })
})
