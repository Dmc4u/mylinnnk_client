/**
 * The customer dashboard (/dashboard, also /account): real counts, renewal reminders from the server's
 * dates, safe renew actions, payments and support.
 */
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'
import { dashboardCounts, daysUntil, publicationAction, renewalReminders } from './AccountPage/dashboardData.js'

vi.setConfig({ testTimeout: 15000 })

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-11-15T12:00:00Z')
const iso = (offsetDays) => new Date(NOW + offsetDays * DAY).toISOString()
const pub = (slug, extra = {}) => ({
  slug,
  path: `/p/${slug}`,
  url: `http://localhost:3002/p/${slug}`,
  title: slug,
  pageTitle: slug,
  planName: 'Celebration',
  status: 'active',
  effectiveStatus: 'active',
  publiclyVisible: true,
  suspended: false,
  pageId: `665f0000000000000000${String(slug.length).padStart(4, '0')}`,
  templateSlug: 'garden-vows',
  pageDeleted: false,
  activatedAt: iso(-20),
  expiresAt: iso(10),
  ...extra,
})

describe('dashboard data (pure)', () => {
  const live = pub('live-long', { expiresAt: iso(40) })
  const ending = pub('ending', { expiresAt: iso(3) })
  const expired = pub('gone', { status: 'expired', effectiveStatus: 'expired', publiclyVisible: false, expiresAt: iso(-2) })
  const suspended = pub('paused', { suspended: true, publiclyVisible: false, expiresAt: iso(2) })
  const pending = pub('checking', { status: 'pending_review', effectiveStatus: 'pending_review', publiclyVisible: false, orderRef: 'MLK-AAAA-BBBB' })

  it('counts only what the server reports', () => {
    expect(dashboardCounts({ drafts: [{}, {}, {}], publications: [live, ending, expired, suspended, pending], now: NOW })).toEqual({ drafts: 3, published: 5, live: 2, attention: 2, expiringSoon: 1 })
    expect(dashboardCounts({})).toEqual({ drafts: null, published: null, live: null, attention: null, expiringSoon: null })
  })

  it('reminds about pages ending within 14 days and expired ones; never suspended ones', () => {
    const reminders = renewalReminders([live, ending, expired, suspended, pending], [], NOW)
    expect(reminders.map((r) => [r.pub.slug, r.state, r.daysLeft])).toEqual([
      ['gone', 'expired', 0],
      ['ending', 'expiring', 3],
    ])
    expect(daysUntil(iso(0.5), NOW)).toBe(1)
  })

  it('never offers Renew when the server would refuse it', () => {
    expect(publicationAction(ending, [])).toMatchObject({ canRenew: true, renewLabel: 'Renew' })
    expect(publicationAction(expired, [])).toMatchObject({ canRenew: true })
    expect(publicationAction(suspended, [])).toMatchObject({ canRenew: false, reason: 'suspended' })
    expect(publicationAction(pending, [])).toMatchObject({ canRenew: false, reason: 'payment', orderRef: 'MLK-AAAA-BBBB' })
    const openRenewal = [{ reference: 'MLK-CCCC-DDDD', status: 'awaiting_transfer', pageId: ending.pageId }]
    expect(publicationAction(ending, openRenewal)).toMatchObject({ canRenew: false, reason: 'renewal_in_progress', orderRef: 'MLK-CCCC-DDDD' })
    expect(publicationAction(ending, [{ reference: 'MLK-OLD1-OLD2', status: 'approved', pageId: ending.pageId }])).toMatchObject({ canRenew: true })
    expect(publicationAction({ ...ending, pageDeleted: true }, [])).toMatchObject({ canRenew: false, reason: 'deleted' })
    expect(publicationAction(pub('off', { status: 'unpublished', effectiveStatus: 'unpublished', publiclyVisible: false }), [])).toMatchObject({ canRenew: true, renewLabel: 'Publish again' })
  })
})

describe('dashboard views', () => {
  function anaWith({ publications = [], orders = [], email = 'ana@example.com' } = {}) {
    const api = createFakeAuthApi()
    const ana = api.addUser({ email, displayName: 'Ana', emailVerified: true })
    api.signIn(ana)
    api.state.publications = publications
    api.state.orders = orders
    return api
  }
  const nav = () => screen.getByRole('navigation', { name: 'Dashboard' })

  it('one layout with a persistent menu; each view is its own route, highlighted when active', async () => {
    const { user, location } = renderApp('/dashboard', { api: anaWith() })
    expect(await screen.findByRole('heading', { level: 1, name: 'Your dashboard' })).toBeInTheDocument()
    expect(within(nav()).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/dashboard', '/dashboard/publications', '/dashboard/drafts', '/dashboard/payments', '/dashboard/support', '/dashboard/account'])
    expect(within(nav()).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    for (const [name, path, heading] of [
      ['Published pages', '/dashboard/publications', 'Published pages'],
      ['Drafts', '/dashboard/drafts', 'Drafts'],
      ['Payments', '/dashboard/payments', 'Payments'],
      ['Help & support', '/dashboard/support', 'Help & support'],
      ['Account', '/dashboard/account', 'Account'],
    ]) {
      await user.click(within(nav()).getByRole('link', { name }))
      await waitFor(() => expect(location()).toBe(path))
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
      expect(within(nav()).getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
    }
    // Only the open view's content is shown.
    expect(screen.queryByRole('region', { name: 'Published pages' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('/account and its old #sections still work (redirects)', async () => {
    for (const [from, to] of [
      ['/account', '/dashboard'],
      ['/account#payments', '/dashboard/payments'],
      ['/account#published', '/dashboard/publications'],
      ['/account#drafts', '/dashboard/drafts'],
    ]) {
      const { location, unmount } = renderApp(from, { api: anaWith() })
      await waitFor(() => expect(location()).toBe(to))
      unmount()
    }
  })

  it('long names and emails wrap inside the sidebar instead of overflowing', async () => {
    renderApp('/dashboard', { api: anaWith({ email: 'a.very.long.email.address.for.testing.wrapping@an-extremely-long-domain-name.example.com' }) })
    const email = await screen.findByText(/a\.very\.long\.email/, { selector: '.dash__who-email' })
    expect(email.closest('.dash__who-text')).not.toBeNull()
    const css = readFileSync(resolve(process.cwd(), 'src/pages/AccountPage/AccountPage.css'), 'utf8')
    expect(css).toMatch(/\.dash__who-name, \.dash__who-email \{ overflow-wrap: anywhere;/)
    expect(css).toMatch(/\.dash__who-text \{ min-width: 0; \}/)
  })

  it('overview: welcome, cards that open their views, reminders, recent activity and quick actions', async () => {
    const now = Date.now()
    const soon = pub('soon', { expiresAt: new Date(now + 3 * DAY).toISOString(), activatedAt: new Date(now - 27 * DAY).toISOString() })
    const later = pub('later', { expiresAt: new Date(now + 60 * DAY).toISOString() })
    const order = { reference: 'MLK-ABCD-2345', kind: 'publish', status: 'approved', pageId: later.pageId, plan: { planId: 'celebration', name: 'Celebration', amountMinor: 250000, currency: 'NGN', validityDays: 30 }, createdAt: new Date(now - DAY).toISOString(), updatedAt: new Date(now - DAY).toISOString() }
    const { user, location } = renderApp('/dashboard', { api: anaWith({ publications: [soon, later], orders: [order] }) })
    expect(await screen.findByRole('heading', { name: 'Welcome back, Ana' })).toBeInTheDocument()
    const stats = screen.getByRole('navigation', { name: 'Your pages at a glance' })
    await waitFor(() => expect(within(stats).getByRole('link', { name: 'Published pages: 2' })).toHaveAttribute('href', '/dashboard/publications'))
    expect(within(stats).getByRole('link', { name: 'Live now: 2' })).toBeInTheDocument()
    expect(within(stats).getByRole('link', { name: 'Saved drafts: 0' })).toHaveAttribute('href', '/dashboard/drafts')
    const reminders = screen.getByRole('region', { name: 'Renewal reminders' })
    expect(within(reminders).getByText(/3 days left/)).toBeInTheDocument()
    expect(within(reminders).getByRole('link', { name: 'Renew soon' })).toHaveAttribute('href', `/publish/${soon.pageId}`)
    const activity = screen.getByRole('region', { name: 'Recent activity' })
    expect(within(activity).getByRole('link', { name: 'Payment MLK-ABCD-2345: Payment confirmed' })).toHaveAttribute('href', '/orders/MLK-ABCD-2345')
    expect(within(screen.getByRole('region', { name: 'Quick actions' })).getByRole('link', { name: 'Create a new page' })).toHaveAttribute('href', '/templates')
    // The overview never lists every draft, payment and page.
    expect(screen.queryByRole('region', { name: 'Payments' })).not.toBeInTheDocument()
    await user.click(within(stats).getByRole('link', { name: 'Published pages: 2' }))
    await waitFor(() => expect(location()).toBe('/dashboard/publications'))
  })

  it('a renewal already being paid for shows its payment instead of Renew; payments separate payment and page status', async () => {
    const soon = pub('soon', { expiresAt: new Date(Date.now() + 2 * DAY).toISOString() })
    const order = { reference: 'MLK-RNEW-2345', kind: 'renewal', status: 'submitted', pageId: soon.pageId, plan: { planId: 'celebration', name: 'Celebration', amountMinor: 250000, currency: 'NGN', validityDays: 30 }, createdAt: new Date().toISOString() }
    const api = anaWith({ publications: [soon], orders: [order] })
    const { user } = renderApp('/dashboard', { api })
    const reminders = await screen.findByRole('region', { name: 'Renewal reminders' })
    expect(within(reminders).queryByRole('link', { name: /^Renew/ })).not.toBeInTheDocument()
    expect(within(reminders).getByRole('link', { name: 'Payment in progress' })).toHaveAttribute('href', '/orders/MLK-RNEW-2345')

    await user.click(within(nav()).getByRole('link', { name: 'Published pages' }))
    const published = await screen.findByRole('region', { name: 'Published pages' })
    expect(await within(published).findByText('A payment for this page is in progress.')).toBeInTheDocument()
    expect(within(published).queryByRole('link', { name: /^Renew/ })).not.toBeInTheDocument()

    await user.click(within(nav()).getByRole('link', { name: 'Payments' }))
    const payments = await screen.findByRole('region', { name: 'Payments' })
    expect(within(payments).getByRole('link', { name: 'Payment MLK-RNEW-2345' })).toHaveAttribute('href', '/orders/MLK-RNEW-2345')
    expect(within(payments).getByText('Payment Under Review').closest('.account-orders__status')).toHaveTextContent('Payment: Payment Under Review')
    expect(within(payments).getByText('Live').closest('.account-orders__status')).toHaveTextContent('Page: Live')
    expect(within(payments).getByRole('link', { name: '/p/soon' })).toHaveAttribute('href', soon.url)

    await user.click(within(nav()).getByRole('link', { name: 'Help & support' }))
    expect(await screen.findByRole('link', { name: 'Ask about payment MLK-RNEW-2345' })).toHaveAttribute('href', '/contact?topic=payments&ref=MLK-RNEW-2345')
  })

  it('suspended pages: clearly marked, no Renew, a way to contact support', async () => {
    renderApp('/dashboard/publications', { api: anaWith({ publications: [pub('paused', { suspended: true, publiclyVisible: false })] }) })
    const published = await screen.findByRole('region', { name: 'Published pages' })
    const item = (await within(published).findByText('paused', { selector: '.account-published__title' })).closest('li')
    expect(within(item).getByText('Suspended')).toBeInTheDocument()
    expect(within(item).queryByRole('link', { name: /Renew/ })).not.toBeInTheDocument()
    expect(within(item).getByRole('link', { name: 'Contact support' })).toHaveAttribute('href', '/contact?topic=publishing&ref=%2Fp%2Fpaused')
  })

  it('contact links from the dashboard pre-fill the topic and reference (only safe values)', async () => {
    renderApp('/contact?topic=payments&ref=MLK-RNEW-2345', { api: anaWith() })
    const main = await screen.findByRole('main')
    expect(await within(main).findByLabelText('Topic')).toHaveValue('payments')
    expect(within(main).getByLabelText('Subject')).toHaveValue('About MLK-RNEW-2345')
  })

  it('ignores unknown topics and unsafe references', async () => {
    renderApp('/contact?topic=admin&ref=<script>', { api: anaWith() })
    const main = await screen.findByRole('main')
    expect(await within(main).findByLabelText('Topic')).toHaveValue('')
    expect(within(main).getByLabelText('Subject')).toHaveValue('')
  })

  it('signed-out visitors are sent to log in, and come back to the view they asked for', async () => {
    const { location } = renderApp('/dashboard/payments')
    await waitFor(() => expect(location()).toBe('/login?next=%2Fdashboard%2Fpayments'))
  })
})
