/**
 * In-app notifications (Stage 2): the live connection (EventSource), the bell and its panel, the
 * notifications pages, the administrator's payments badge, and the polling fallback.
 * The live stream is a controllable fake EventSource; the REST endpoints are the fake API's.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import AuthProvider from '../auth/AuthProvider.jsx'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'
import { badgeText, relativeTime, useNotifications } from './NotificationsContext.js'
import NotificationsProvider from './NotificationsProvider.jsx'
import { STREAM_URL } from './notificationsApi.js'

class FakeEventSource {
  static instances = []
  constructor(url, options) {
    this.url = url
    this.options = options
    this.readyState = 0
    this.listeners = {}
    this.closed = false
    FakeEventSource.instances.push(this)
  }
  addEventListener(name, fn) {
    ;(this.listeners[name] ??= []).push(fn)
  }
  close() {
    this.closed = true
    this.readyState = 2
  }
  emit(name, data, id) {
    act(() => {
      for (const fn of this.listeners[name] ?? []) fn({ data: JSON.stringify(data), lastEventId: id })
    })
  }
  open() {
    this.readyState = 1
    act(() => {
      for (const fn of this.listeners.open ?? []) fn({})
    })
  }
  fail(readyState = 0) {
    this.readyState = readyState
    act(() => this.onerror?.({}))
  }
  static latest = () => FakeEventSource.instances.at(-1)
}

const item = (n, extra = {}) => ({ id: String(n).padStart(40, 'b'), type: 'test.item', title: `Update ${n}`, body: `Details ${n}`, link: '/dashboard/payments', createdAt: new Date(Date.UTC(2026, 10, 20, 10, n)).toISOString(), read: false, readAt: null, ...extra })

function signedIn({ admin = false } = {}) {
  const api = createFakeAuthApi()
  const user = api.addUser({ email: 'ada@example.com', displayName: 'Ada', emailVerified: true, admin })
  api.signIn(user)
  return { api, user }
}

const bell = () => screen.findByRole('button', { name: /^Notifications/ })
/** The live connection, once the provider's effect has opened it (it opens just after the first render). */
const stream = () =>
  waitFor(() => {
    const es = FakeEventSource.latest()
    if (!es || es.closed) throw new Error('no open stream yet')
    return es
  })

beforeEach(() => {
  FakeEventSource.instances = []
  vi.stubGlobal('EventSource', FakeEventSource)
})
afterEach(() => vi.unstubAllGlobals())

describe('live connection and bell', () => {
  it('nothing is shown or opened while signed out', async () => {
    renderApp('/', { api: createFakeAuthApi() })
    await screen.findByRole('link', { name: 'Log in' })
    expect(screen.queryByRole('button', { name: /^Notifications/ })).not.toBeInTheDocument()
    expect(FakeEventSource.instances).toHaveLength(0)
  })

  it('opens one authenticated stream and shows the server’s unread count', async () => {
    const { api } = signedIn()
    renderApp('/dashboard', { api })
    await bell()
    const es = await stream()
    expect(es.url).toBe(STREAM_URL)
    expect(es.options).toEqual({ withCredentials: true })
    es.open()
    es.emit('snapshot', { unread: 3, latest: [item(1), item(2), item(3)] })
    expect(await screen.findByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument()
    expect(screen.getByText('3', { selector: '.notif__badge' })).toBeInTheDocument()
    es.emit('snapshot', { unread: 150, latest: [] })
    expect(screen.getByText('99+', { selector: '.notif__badge' })).toBeInTheDocument()
    expect(badgeText(99)).toBe('99')
  })

  it('live items appear once (duplicates ignored); counts follow the server; a reconnection never double-counts', async () => {
    const { api } = signedIn()
    const { user } = renderApp('/dashboard', { api })
    const es = (await bell(), await stream())
    es.open()
    es.emit('snapshot', { unread: 1, latest: [item(1)] })
    es.emit('notification', item(2), item(2).id)
    es.emit('notification', item(2), item(2).id)
    es.emit('summary', { unread: 2 })
    await user.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }))
    const panel = screen.getByRole('region', { name: 'Notifications' })
    expect(within(panel).getAllByText('Update 2')).toHaveLength(1)
    // The connection drops and comes back: the snapshot replaces the state.
    es.emit('snapshot', { unread: 2, latest: [item(1), item(2)] })
    expect(within(panel).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Notifications, 2 unread' })).toBeInTheDocument()
  })

  it('the panel: keyboard and pointer friendly, mark one or all as read, open the linked page', async () => {
    const { api, user: account } = signedIn()
    const one = api.addNotification(account, { title: 'Payment received', link: '/dashboard/payments' })
    api.addNotification(account, { title: 'Page published', link: '/dashboard/publications' })
    const { user, location } = renderApp('/dashboard', { api })
    const es = (await bell(), await stream())
    es.open()
    const latest = api.state.notifications.map((n) => ({ ...item(0), id: n.id, title: n.title, link: n.link, createdAt: n.createdAt }))
    es.emit('snapshot', { unread: 2, latest })

    const button = await screen.findByRole('button', { name: 'Notifications, 2 unread' })
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument()
    expect(button).toHaveFocus()

    await user.click(button)
    await user.click(screen.getByRole('link', { name: /Payment received/ }))
    await waitFor(() => expect(location()).toBe('/dashboard/payments'))
    const read = api.state.requests.find((r) => r.method === 'POST' && r.path === `/notifications/${one.id}/read`)
    expect(read.headers['X-CSRF-Token']).toBe(api.state.session.csrfToken)
    expect(await screen.findByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }))
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }))
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument()
    expect(api.state.requests.some((r) => r.method === 'POST' && r.path === '/notifications/read-all')).toBe(true)

    // A click outside closes the panel.
    await user.click(document.body)
    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument()
  })

  it('falls back to polling the summary when the stream keeps failing, and when EventSource is unavailable', async () => {
    const { api, user: account } = signedIn()
    api.addNotification(account, { title: 'One' })
    renderApp('/dashboard', { api })
    const es = (await bell(), await stream())
    es.fail()
    es.fail()
    es.fail()
    expect(es.closed).toBe(true)
    await waitFor(() => expect(api.state.requests.some((r) => r.path === '/notifications/summary')).toBe(true))
    expect(await screen.findByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument()
  })

  it('works without EventSource at all (polling only)', async () => {
    vi.stubGlobal('EventSource', undefined)
    const { api, user: account } = signedIn()
    api.addNotification(account, { title: 'One' })
    api.addNotification(account, { title: 'Two' })
    renderApp('/dashboard', { api })
    expect(await screen.findByRole('button', { name: 'Notifications, 2 unread' })).toBeInTheDocument()
  })

  it('stops when the server ends the session', async () => {
    const { api } = signedIn()
    renderApp('/dashboard', { api })
    const es = (await bell(), await stream())
    es.open()
    es.emit('end', { reason: 'session_ended' })
    expect(es.closed).toBe(true)
  })
})

describe('notifications pages', () => {
  it('customer: history with All / Unread, Load more and Mark all as read', async () => {
    const { api, user: account } = signedIn()
    for (let i = 0; i < 25; i++) api.addNotification(account, { title: `Item ${i}`, read: i < 5 })
    const { user } = renderApp('/dashboard/notifications', { api })
    expect(await screen.findByRole('heading', { name: 'Notifications', level: 1 })).toBeInTheDocument()
    const history = screen.getByRole('region', { name: 'Notification history' })
    await waitFor(() => expect(within(history).getAllByRole('listitem')).toHaveLength(20))
    expect(within(history).getAllByRole('listitem')[0]).toHaveTextContent('Item 24')
    await user.click(within(history).getByRole('button', { name: 'Load more' }))
    await waitFor(() => expect(within(history).getAllByRole('listitem')).toHaveLength(25))

    await user.click(within(history).getByRole('button', { name: 'Unread' }))
    await waitFor(() => expect(within(history).getAllByRole('listitem')).toHaveLength(20))
    expect(within(history).queryByText('Item 0')).not.toBeInTheDocument()
    const live = await stream()
    live.open()
    live.emit('snapshot', { unread: 20, latest: [] })
    await user.click(await within(history).findByRole('button', { name: 'Mark all as read' }))
    expect(await within(history).findByText('You have no unread notifications.')).toBeInTheDocument()
  })

  it('a live arrival shows at the top of an open history page', async () => {
    const { api, user: account } = signedIn()
    api.addNotification(account, { title: 'Earlier' })
    renderApp('/dashboard/notifications', { api })
    const history = await screen.findByRole('region', { name: 'Notification history' })
    await within(history).findByText('Earlier')
    const es = await stream()
    es.open()
    es.emit('notification', item(59, { title: 'Just arrived' }), item(59).id)
    await waitFor(() => expect(within(history).getAllByRole('listitem')[0]).toHaveTextContent('Just arrived'))
  })
})

describe('administrator payments badge', () => {
  function adminSetup() {
    const { api } = signedIn({ admin: true })
    const base = api.fetch
    api.fetch = async (url, init = {}) => {
      const path = new URL(url, 'http://localhost').pathname.replace(/^\/api\/v1/, '')
      const json = (data) => new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } })
      if (path === '/admin/me') return json({ user: { id: 'u1', displayName: 'Ada', email: 'support@example.com' }, role: 'admin' })
      if (path === '/admin/overview') return json({ users: { total: 1, verified: 1 }, drafts: 0, publications: { active: 0 }, orders: { submitted: 0 }, awaitingReview: 0 })
      return base(url, init)
    }
    return api
  }

  it('shows the live count of payments awaiting review, independent of unread notifications', async () => {
    const api = adminSetup()
    const { user } = renderApp('/admin', { api })
    const nav = await screen.findByRole('navigation', { name: 'Administration' })
    const es = await stream()
    es.open()
    es.emit('snapshot', { unread: 1, latest: [item(1)], paymentsAwaitingReview: 4 })
    const payments = within(nav).getByRole('link', { name: /Payment reviews/ })
    expect(payments).toHaveTextContent('4')
    expect(payments).toHaveAccessibleName(/^Payment reviews, 4 awaiting review$/)
    es.emit('badge', { paymentsAwaitingReview: 3 })
    expect(payments).toHaveTextContent('3')

    // Marking notifications read never changes the payments count.
    await user.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }))
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }))
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument()
    expect(payments).toHaveTextContent('3')
    es.emit('badge', { paymentsAwaitingReview: 0 })
    expect(payments).not.toHaveTextContent(/\d/)
  })

  it('customers never see a payments badge', async () => {
    const { api } = signedIn()
    renderApp('/dashboard', { api })
    await bell()
    const es = await stream()
    es.open()
    es.emit('snapshot', { unread: 0, latest: [], paymentsAwaitingReview: 9 })
    expect(screen.queryByText('9')).not.toBeInTheDocument()
  })
})

describe('copy, time and motion', () => {
  it('relative times are calm and precise', () => {
    const now = Date.parse('2026-11-20T12:00:00Z')
    expect(relativeTime('2026-11-20T11:59:30Z', now)).toBe('Just now')
    expect(relativeTime('2026-11-20T11:55:00Z', now)).toBe('5 min ago')
    expect(relativeTime('2026-11-20T09:00:00Z', now)).toBe('3 h ago')
    expect(relativeTime('2026-11-19T12:00:00Z', now)).toBe('1 day ago')
    expect(relativeTime('2026-11-01T12:00:00Z', now)).toBe('1 Nov 2026')
  })

  it('animations run only when reduced motion is not requested; no emojis in the interface text', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/components/Notifications/Notifications.css'), 'utf8')
    const motion = css.indexOf('@media (prefers-reduced-motion: no-preference)')
    expect(motion).toBeGreaterThan(-1)
    for (const prop of ['transition:', 'animation:']) {
      const first = css.indexOf(prop)
      if (first > -1) expect(first).toBeGreaterThan(motion)
    }
    for (const file of ['src/components/Notifications/NotificationBell.jsx', 'src/components/Notifications/NotificationList.jsx']) {
      expect(readFileSync(resolve(process.cwd(), file), 'utf8')).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })
})

describe('silently dead connections (watchdog)', () => {
  function Probe() {
    const { unread, connection } = useNotifications()
    return <output data-testid="probe">{`${connection}:${unread}`}</output>
  }

  it('a stream that goes quiet is replaced; pings keep a healthy one', async () => {
    const { api } = signedIn()
    vi.stubGlobal('fetch', vi.fn(api.fetch))
    render(
      <MemoryRouter>
        <AuthProvider>
          <NotificationsProvider eventSourceClass={FakeEventSource} staleMs={300}>
            <Probe />
          </NotificationsProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))
    const first = FakeEventSource.latest()
    first.open()
    first.emit('snapshot', { unread: 2, latest: [] })
    expect(screen.getByTestId('probe')).toHaveTextContent('live:2')
    // Pings arrive: the connection is kept.
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 120))
      first.emit('ping', {})
    }
    expect(FakeEventSource.instances).toHaveLength(1)
    // Nothing for longer than staleMs (e.g. a proxy kept a dead connection open): replaced at once.
    await waitFor(() => expect(FakeEventSource.instances.length).toBeGreaterThan(1), { timeout: 2000 })
    expect(first.closed).toBe(true)
    const second = FakeEventSource.latest()
    second.open()
    second.emit('snapshot', { unread: 3, latest: [] })
    expect(screen.getByTestId('probe')).toHaveTextContent('live:3')
  })
})
