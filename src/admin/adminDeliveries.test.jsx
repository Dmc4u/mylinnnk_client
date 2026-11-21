/**
 * /admin/email-deliveries: worker health, counts, filters, masked rows and manual retries.
 * The server decides access, masking and whether a retry is allowed; these tests check what the admin sees
 * and sends.
 */
import 'fake-indexeddb/auto'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

vi.setConfig({ testTimeout: 15000 })

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const HEALTH = (status = 'running') => ({
  status,
  checkedAt: '2026-11-21T12:00:00.000Z',
  lastHeartbeatAt: '2026-11-21T11:59:40.000Z',
  workers: status === 'running' ? [{ host: 'vps', seenAt: '2026-11-21T11:59:40.000Z' }] : [],
  scheduler: { lastRunAt: '2026-11-21T11:50:00.000Z', healthy: true, leaseHeld: false },
  queue: { backlog: 2, oldestPendingAt: '2026-11-21T11:58:00.000Z', retrying: 1, dead: 1, stalled: 0 },
  events: { pending: 0, stalled: 0, failed: 0 },
  smtp: { lastFailureAt: null, lastFailureCode: null, lastSuccessAt: '2026-11-21T11:59:00.000Z', unreachable: false, waitingForServer: 0 },
})
const DEAD = { id: 'a'.repeat(40), type: 'payment.rejected', template: 'payment_rejected', state: 'dead', recipient: 'c***@example.com', attempts: 6, manualRetries: 0, lastError: 'EENVELOPE', reason: null, createdAt: '2026-11-21T10:00:00.000Z', sentAt: null, nextAttemptAt: null, retryable: true, notRetryableReason: null }
const SENT = { ...DEAD, id: 'b'.repeat(40), type: 'account.welcome', template: 'account_welcome', state: 'sent', recipient: 't***@example.com', attempts: 1, lastError: null, sentAt: '2026-11-21T10:01:00.000Z', retryable: false, notRetryableReason: 'not_failed' }
const LIMITED = { ...DEAD, id: 'c'.repeat(40), manualRetries: 3, retryable: false, notRetryableReason: 'retry_limit' }

function setup({ health = 'running', retry = 'ok' } = {}) {
  const api = createFakeAuthApi()
  api.signIn(api.addUser({ email: 'support@dmclimited.net', displayName: 'Support', emailVerified: true, admin: true }))
  const calls = []
  let items = [DEAD, SENT, LIMITED]
  const base = api.fetch
  api.fetch = async (url, init = {}) => {
    const u = new URL(url, 'http://localhost')
    const path = u.pathname.replace(/^\/api\/v1/, '')
    const method = init.method ?? 'GET'
    if (path.startsWith('/admin')) {
      calls.push({ method, path, query: Object.fromEntries(u.searchParams), csrf: init.headers?.['X-CSRF-Token'] })
      if (path === '/admin/me') return json(200, { data: { user: { id: 'u1', displayName: 'Support', email: 'support@dmclimited.net' }, role: 'admin' } })
      if (path === '/admin/overview') return json(200, { data: { users: { total: 3, verified: 2 }, drafts: 5, publications: { active: 1 }, orders: {}, awaitingReview: 0 } })
      if (path === '/admin/email-deliveries/health') return json(200, { data: { health: HEALTH(health) } })
      if (path === '/admin/email-deliveries') {
        return json(200, { data: { summary: { pending: 2, sending: 0, retry: 1, sent: 40, skipped: 3, dead: items.filter((d) => d.state === 'dead').length, queued: 2, sentLast24h: 12 }, items, total: items.length, page: 1, pageSize: 50, types: ['account.welcome', 'payment.rejected'] } })
      }
      if (path === `/admin/email-deliveries/${DEAD.id}/retry` && method === 'POST') {
        if (retry === 'refuse') return json(409, { error: { code: 'RETRY_OUTDATED', message: 'This email is no longer relevant (for example the order, page or enquiry has changed), so it was not sent again.' } })
        items = items.map((d) => (d.id === DEAD.id ? { ...d, state: 'pending', manualRetries: 1, retryable: false, notRetryableReason: 'not_failed' } : d))
        return json(200, { data: { delivery: items[0] } })
      }
      return json(404, { error: { code: 'NOT_FOUND', message: 'Not found.' } })
    }
    return base(url, init)
  }
  return { api, calls }
}

describe('admin email delivery', () => {
  it('shows worker health, counts and masked deliveries; reachable from the navigation', async () => {
    const { api } = setup()
    renderApp('/admin/email-deliveries', { api })
    expect(await screen.findByRole('heading', { level: 1, name: 'Email delivery' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Email delivery' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByText('Running')).toBeInTheDocument()
    expect(screen.getByText(/2 waiting · oldest from/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const table = await screen.findByRole('table')
    expect(within(table).getAllByText('c***@example.com')).toHaveLength(2)
    expect(within(table).getByText('t***@example.com')).toBeInTheDocument()
    expect(within(table).getAllByText('Failed').length).toBeGreaterThan(0)
    expect(within(table).getByText('Sent')).toBeInTheDocument()
    expect(within(table).getByText('Retry limit reached')).toBeInTheDocument()
    expect(within(table).getAllByRole('button', { name: 'Retry' })).toHaveLength(1)
    expect(document.body.textContent).not.toMatch(/[a-z]{2,}@example\.com/)
  })

  it('warns when the worker has stopped, here and on the overview', async () => {
    const { api } = setup({ health: 'stopped' })
    const { user } = renderApp('/admin/email-deliveries', { api })
    expect(await screen.findByText(/The notification worker has stopped\./)).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Stopped')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Overview' }))
    expect(await screen.findByRole('link', { name: 'Open Email delivery' })).toHaveAttribute('href', '/admin/email-deliveries')
  })

  it('filters by status, type and dates (sent to the server)', async () => {
    const { api, calls } = setup()
    const { user } = renderApp('/admin/email-deliveries', { api })
    await screen.findByRole('table')
    await user.selectOptions(screen.getByLabelText('Status'), 'dead')
    await waitFor(() => expect(calls.filter((c) => c.path === '/admin/email-deliveries').at(-1).query).toMatchObject({ state: 'dead' }))
    await user.selectOptions(screen.getByLabelText('Type'), 'payment.rejected')
    await user.type(screen.getByLabelText('From'), '2026-11-20')
    await waitFor(() => expect(calls.filter((c) => c.path === '/admin/email-deliveries').at(-1).query).toMatchObject({ state: 'dead', type: 'payment.rejected', from: '2026-11-20' }))
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(calls.filter((c) => c.path === '/admin/email-deliveries').at(-1).query).toEqual({ page: '1' }))
  })

  it('retry: asks first, sends one request with the CSRF token, confirms and focuses the result', async () => {
    const { api, calls } = setup()
    const { user } = renderApp('/admin/email-deliveries', { api })
    await user.click(await screen.findByRole('button', { name: 'Retry' }))
    const group = screen.getByRole('group', { name: 'Send this payment: rejected email again' })
    await user.click(within(group).getByRole('button', { name: 'Cancel' }))
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await user.dblClick(screen.getByRole('button', { name: 'Send again' }))
    const done = await screen.findByText(/The payment: rejected email to c\*\*\*@example.com is queued again/)
    await waitFor(() => expect(done).toHaveFocus())
    const posts = calls.filter((c) => c.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0].csrf).toBe(api.state.session.csrfToken)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument())
  })

  it('retry refused by the server: the reason is shown', async () => {
    const { api } = setup({ retry: 'refuse' })
    const { user } = renderApp('/admin/email-deliveries', { api })
    await user.click(await screen.findByRole('button', { name: 'Retry' }))
    await user.click(screen.getByRole('button', { name: 'Send again' }))
    expect(await screen.findByText(/no longer relevant/)).toHaveAttribute('role', 'alert')
  })
})
