/**
 * Phase 5, Stages 3–5 (frontend): the admin dashboard and the customer's publishing and payment
 * pages. The server decides everything; these tests check what people see and send.
 */
import 'fake-indexeddb/auto'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PLANS_FIXTURE from '../test/fixtures/plans.json'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'
import { RECEIPT_ACCEPT, localToday } from '../services/publishingApi.js'

vi.setConfig({ testTimeout: 15000 })

const ORDER = {
  reference: 'MLK-ABCD-EFGH',
  kind: 'publish',
  status: 'submitted',
  customer: { id: 'u1', displayName: 'Ada', email: 'a***@example.com' },
  page: { slug: 'ada-and-tunde', status: 'pending_review' },
  plan: { planId: 'celebration', name: 'Celebration', amountMinor: 250000, currency: 'NGN', validityDays: 30 },
  paymentMode: 'test',
  submission: { payerName: 'Ada Obi', transferDate: '2026-11-12', note: '', submittedAt: '2026-11-12T11:00:00.000Z', count: 1 },
  receipts: [{ receiptId: 'rcpt_0123456789abcdef', contentType: 'image/webp', bytes: 2048, uploadedAt: '2026-11-12T11:00:00.000Z' }],
  review: null,
  history: [],
  createdAt: '2026-11-12T09:00:00.000Z',
  updatedAt: '2026-11-12T11:00:00.000Z',
}
const CUSTOMER_ORDER = {
  reference: 'MLK-ABCD-EFGH',
  kind: 'publish',
  status: 'awaiting_transfer',
  message: 'Transfer the exact amount with your reference, then tell us you’ve paid.',
  plan: { planId: 'celebration', name: 'Celebration', amountMinor: 250000, currency: 'NGN', validityDays: 30 },
  pageId: '665f00000000000000000001',
  expiresAt: '2026-11-15T09:00:00.000Z',
  submission: null,
  receipts: [],
  rejectionReason: null,
  instructions: {
    isTest: true,
    bankName: 'TEST BANK (NOT A REAL ACCOUNT)',
    accountName: 'TEST ONLY: DO NOT TRANSFER',
    accountNumber: '0000000000',
    amountMinor: 250000,
    currency: 'NGN',
    reference: 'MLK-ABCD-EFGH',
    steps: ['Transfer the exact amount.', 'Write MLK-ABCD-EFGH in the narration.', 'Press “I have paid”.'],
  },
  createdAt: '2026-11-12T09:00:00.000Z',
  updatedAt: '2026-11-12T09:00:00.000Z',
}

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The fake auth API plus the admin and payment endpoints these screens use. */
function setup({ admin = false, signedIn = true, checkout = null, adminErrors = {}, customerOrder = {}, submitError = null, afterSubmitError = null } = {}) {
  const api = createFakeAuthApi()
  if (signedIn) {
    const user = api.addUser({ email: 'ada@example.com', displayName: 'Ada', emailVerified: true, admin })
    api.signIn(user)
  }
  const calls = []
  const order = { admin: structuredClone(ORDER), customer: { ...structuredClone(CUSTOMER_ORDER), ...customerOrder } }
  const base = api.fetch
  api.fetch = async (url, init = {}) => {
    const path = new URL(url, 'http://localhost').pathname.replace(/^\/api\/v1/, '')
    const method = init.method ?? 'GET'
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
    if (path.startsWith('/admin') || path.startsWith('/orders') || /\/pages\/[^/]+\/(orders|publication)/.test(path) || path === '/plans') calls.push({ method, path, body, csrf: init.headers?.['X-CSRF-Token'] })
    if (path === '/plans' && checkout) return json(200, { data: { ...structuredClone(PLANS_FIXTURE), checkout } })
    if (path.startsWith('/admin')) {
      if (!signedIn) return json(401, { error: { code: 'UNAUTHENTICATED', message: 'You need to sign in.' } })
      if (!admin) return json(403, { error: { code: 'NOT_AN_ADMIN', message: 'You don’t have access to administration.' } })
      if (adminErrors[path]) return json(adminErrors[path].status, { error: adminErrors[path] })
      if (path === '/admin/me') return json(200, { data: { user: { id: 'u1', displayName: 'Ada', email: 'support@dmclimited.net' }, role: 'admin' } })
      if (path === '/admin/users') return json(200, { data: { items: [{ id: 'u2', displayName: 'Bola', email: 'bola@example.com', emailVerified: true, status: 'active', role: 'user', lastLoginAt: null, createdAt: '2026-11-12T09:00:00.000Z' }], total: 1, page: 1, pageSize: 50 } })
      if (path === '/admin/overview') return json(200, { data: { users: { total: 3, verified: 2 }, drafts: 5, publications: { active: 1 }, orders: { submitted: 1 }, awaitingReview: 1 } })
      if (path === '/admin/payments') return json(200, { data: { items: [order.admin], total: 1, page: 1, pageSize: 50 } })
      if (path === `/admin/payments/${ORDER.reference}`) return json(200, { data: { order: order.admin } })
      if (path === `/admin/payments/${ORDER.reference}/approve` && method === 'POST') {
        order.admin = { ...order.admin, status: 'approved', review: { decision: 'approved', decidedAt: new Date().toISOString(), bankTransactionRef: body.bankTransactionRef, reason: '' } }
        return json(200, { data: { order: order.admin } })
      }
      return json(404, { error: { code: 'NOT_FOUND', message: 'Not found.' } })
    }
    if (path === `/orders/${CUSTOMER_ORDER.reference}`) return json(200, { data: { order: order.customer } })
    if (path === `/orders/${CUSTOMER_ORDER.reference}/submit` && method === 'POST' && submitError) {
      if (afterSubmitError) order.customer = { ...order.customer, ...afterSubmitError }
      return json(submitError.status, { error: submitError })
    }
    if (path === `/orders/${CUSTOMER_ORDER.reference}/submit` && method === 'POST') {
      order.customer = { ...order.customer, status: 'submitted', message: 'Thanks! We’ll check our bank account for your transfer.', submission: { ...body, submittedAt: new Date().toISOString() } }
      return json(200, { data: { order: order.customer } })
    }
    if (path === `/orders/${CUSTOMER_ORDER.reference}/receipts` && method === 'PUT') {
      order.customer = { ...order.customer, receipts: [{ receiptId: 'rcpt_0123456789abcdef', contentType: 'image/webp', bytes: 4096, uploadedAt: new Date().toISOString() }] }
      return json(201, { data: { order: order.customer, receipt: order.customer.receipts[0] } })
    }
    if (path === '/orders') return json(200, { data: { orders: [order.customer] } })
    if (/^\/pages\/[^/]+\/publication$/.test(path)) return json(200, { data: { publication: { slug: 'ada-and-tunde', path: '/p/ada-and-tunde', status: 'draft' } } })
    if (/^\/pages\/[^/]+\/orders$/.test(path) && method === 'POST') return json(201, { data: { order: order.customer } })
    return base(url, init)
  }
  return { api, calls }
}

describe('admin dashboard', () => {
  it('asks signed-out visitors to sign in, and tells ordinary users they have no access', async () => {
    renderApp('/admin', setup({ signedIn: false }))
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', expect.stringContaining('/login'))
  })

  it('shows “No access” to a signed-in non-admin', async () => {
    renderApp('/admin', setup({ admin: false }))
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
  })

  it('shows the admin every section, labelled simply “Admin” (no other roles exist)', async () => {
    renderApp('/admin', setup({ admin: true }))
    const nav = await screen.findByRole('navigation', { name: 'Administration' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Overview', 'Users', 'Publications', 'Payment reviews', 'Transactions', 'Audit log', 'Settings'])
    expect(screen.getByText('Admin', { selector: 'b' })).toBeInTheDocument()
    expect(screen.queryByText(/super admin/i)).not.toBeInTheDocument()
    expect(await screen.findByText('Payments to review')).toBeInTheDocument()
  })

  it('users page: shows each role and offers no way to change roles', async () => {
    const { calls, ...rest } = setup({ admin: true })
    renderApp('/admin/users', rest)
    const row = (await screen.findByText('bola@example.com')).closest('tr')
    expect(within(row).getByText('User')).toBeInTheDocument()
    expect(within(row).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Sign Bola out everywhere' })).toBeInTheDocument()
    expect(calls.some((c) => c.path.endsWith('/role'))).toBe(false)
  })

  it('lets the admin approve only after confirming the bank credit, sending the amount in kobo', async () => {
    const { calls, ...rest } = setup({ admin: true })
    const { user } = renderApp(`/admin/payments/${ORDER.reference}`, rest)
    expect(await screen.findByRole('link', { name: /Receipt 1/ })).toHaveAttribute('href', `/api/v1/admin/payments/${ORDER.reference}/receipts/rcpt_0123456789abcdef`)
    const approve = screen.getByRole('button', { name: 'Approve and publish' })
    await user.type(screen.getByLabelText('Amount credited (₦)'), '2500')
    await user.type(screen.getByLabelText('Credited at'), '2026-11-12T10:30')
    await user.type(screen.getByLabelText('Bank transaction reference'), 'NIP-0001')
    expect(approve).toBeDisabled() // not until the reviewer confirms they saw the credit
    await user.click(screen.getByLabelText(/I checked the bank account/))
    await user.click(approve)
    await screen.findByText('Payment approved. The page is published.')
    const call = calls.find((c) => c.path.endsWith('/approve'))
    expect(call.body.verifiedAmountMinor).toBe(250000)
    expect(call.body.bankTransactionRef).toBe('NIP-0001')
    expect(call.csrf).toBeTruthy()
  })

  it('signs out from the dashboard and returns to the sign-in gate', async () => {
    const { user } = renderApp('/admin', setup({ admin: true }))
    expect(await screen.findByText('Admin', { selector: 'b' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    const signIn = await screen.findByRole('link', { name: 'Sign in' })
    expect(decodeURIComponent(signIn.getAttribute('href'))).toMatch(/^\/login.*\/admin/) // back to the dashboard after signing in
    expect(screen.queryByRole('navigation', { name: 'Administration' })).not.toBeInTheDocument()
  })

  it('shows a signed-in non-admin no payment data at all (the server refuses; nothing is rendered)', async () => {
    renderApp(`/admin/payments/${ORDER.reference}`, setup({ admin: false }))
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Receipt 1/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve and publish' })).not.toBeInTheDocument()
  })
})

describe('customer payment pages', () => {
  it('shows test payment details with an unmistakable warning, and reports a payment', async () => {
    const { calls, ...rest } = setup()
    const { user } = renderApp(`/orders/${CUSTOMER_ORDER.reference}`, rest)
    expect(await screen.findByText('TEST MODE: these are not real bank details. Do not transfer money.')).toBeInTheDocument()
    expect(screen.getAllByText('₦2,500', { selector: 'dd' })).toHaveLength(2) // amount owed and exact amount to transfer
    expect(screen.getAllByText('MLK-ABCD-EFGH').length).toBeGreaterThan(0)
    await user.type(screen.getByLabelText('Name on the paying account'), 'Ada Obi')
    await user.click(screen.getByRole('button', { name: 'I have paid' }))
    expect(await screen.findByText('Payment reported')).toBeInTheDocument()
    const call = calls.find((c) => c.path.endsWith('/submit'))
    expect(Object.keys(call.body).sort()).toEqual(['note', 'payerName', 'transferDate']) // never an amount or a status
  })

  it('uploads a receipt as evidence', async () => {
    const { calls, ...rest } = setup()
    const { user } = renderApp(`/orders/${CUSTOMER_ORDER.reference}`, rest)
    await screen.findByText(/TEST MODE/)
    const input = screen.getByLabelText('Add a receipt')
    expect(input).toHaveAttribute('accept', RECEIPT_ACCEPT)
    expect(RECEIPT_ACCEPT).not.toMatch(/pdf/) // screenshots and photos only, until PDFs can be sanitised
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'receipt.png', { type: 'image/png' })
    await user.upload(input, file)
    expect(await screen.findByText('Receipt added.')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'PUT' && c.path.endsWith('/receipts'))).toBe(true)
  })

  it('publish page: address, plan, then a payment order (no price sent)', async () => {
    const { calls, ...rest } = setup({ checkout: { available: true, test: true, message: 'Test mode' } })
    const { user, location } = renderApp('/publish/665f00000000000000000001', rest)
    expect(await screen.findByText(/Test mode: payment details are placeholders/)).toBeInTheDocument()
    await user.click(await screen.findByRole('radio', { name: /Professional Monthly/ }))
    await user.click(screen.getByRole('button', { name: 'Get payment details' }))
    await waitFor(() => expect(location()).toBe(`/orders/${CUSTOMER_ORDER.reference}`))
    const call = calls.find((c) => c.method === 'POST' && c.path.endsWith('/orders'))
    expect(call.body).toEqual({ planId: 'pro-monthly' })
  })

  it('publish page: unavailable while the server doesn’t offer checkout', async () => {
    renderApp('/publish/665f00000000000000000001', setup())
    expect(await screen.findByText(/Paid publishing isn’t available yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Get payment details' })).toBeDisabled()
  })
})

/* ---------------- Security review remediation ---------------- */

const REAUTH = { status: 401, code: 'ADMIN_REAUTH_REQUIRED', message: 'Please sign in again to continue in administration.' }

describe('admin re-authentication (session older than the admin limit)', () => {
  it('a signed-in admin with an old session can actually sign in again (no loop back to the dashboard)', async () => {
    const { user, location } = renderApp('/admin/payments', setup({ admin: true, adminErrors: { '/admin/me': REAUTH } }))
    const again = await screen.findByRole('button', { name: 'Sign in again' })
    expect(screen.getByText(/administration needs a recent sign-in/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument() // a plain link would only reach “You’re logged in”
    await user.click(again)
    await waitFor(() => expect(location()).toBe(`/login?next=${encodeURIComponent('/admin/payments')}`))
    // Signed out first, so the sign-in form is shown (not “You’re logged in → Continue”).
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Continue' })).not.toBeInTheDocument()
  })

  it('offers the same when the session gets too old while a page is open', async () => {
    renderApp('/admin/payments', setup({ admin: true, adminErrors: { '/admin/payments': REAUTH } }))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('button', { name: 'Sign in again' })).toBeEnabled()
    expect(within(alert).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows reviewers whether an order was made in test mode, and the transfer day as given', async () => {
    renderApp(`/admin/payments/${ORDER.reference}`, setup({ admin: true }))
    expect(await screen.findByText('Test (not real money)')).toBeInTheDocument()
    const day = new Date('2026-11-12T00:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC' })
    expect(screen.getByText(`Ada Obi on ${day}`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Receipt 1 (image)' })).toBeInTheDocument()
  })
})

describe('transfer date', () => {
  it('is today in the customer’s own calendar, at any time of day', () => {
    expect(localToday(new Date(2026, 10, 13, 0, 5))).toBe('2026-11-13') // just after midnight
    expect(localToday(new Date(2026, 10, 13, 9, 30))).toBe('2026-11-13') // a morning transfer
    expect(localToday(new Date(2026, 10, 13, 23, 59))).toBe('2026-11-13') // late evening
    expect(localToday(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })

  it('is sent as a plain day, never with an invented time that could lie in the future', async () => {
    const { calls, ...rest } = setup()
    const { user } = renderApp(`/orders/${CUSTOMER_ORDER.reference}`, rest)
    await screen.findByText(/TEST MODE/)
    const date = screen.getByLabelText('Transfer date')
    expect(date).toHaveValue(localToday())
    expect(date).toHaveAttribute('max', localToday())
    expect(date).toHaveAccessibleDescription('The day your bank shows for the transfer.')
    await user.type(screen.getByLabelText('Name on the paying account'), 'Ada Obi')
    await user.click(screen.getByRole('button', { name: 'I have paid' }))
    await screen.findByText('Payment reported')
    const call = calls.find((c) => c.path.endsWith('/submit'))
    expect(call.body.transferDate).toBe(localToday())
    expect(call.body.transferDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('order states after the security fixes', () => {
  it('a payment reported after the deadline: explains it and shows the order as expired', async () => {
    const expired = { status: 'expired', message: 'This order expired before a payment was confirmed. Start a new one when you’re ready.', instructions: null, expiresAt: null }
    const { user } = renderApp(
      `/orders/${CUSTOMER_ORDER.reference}`,
      setup({ submitError: { status: 409, code: 'ORDER_EXPIRED', message: 'This order passed its payment deadline, so it has expired.' }, afterSubmitError: expired }),
    )
    await screen.findByText(/TEST MODE/)
    await user.type(screen.getByLabelText('Name on the paying account'), 'Ada Obi')
    await user.click(screen.getByRole('button', { name: 'I have paid' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This order passed its payment deadline')
    expect(await screen.findByText('Expired')).toBeInTheDocument() // reloaded from the server
    expect(screen.queryByRole('button', { name: 'I have paid' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Add a receipt')).not.toBeInTheDocument()
  })

  it('while payments are paused: no bank details, no “I have paid” or uploads, but the order can be cancelled', async () => {
    renderApp(`/orders/${CUSTOMER_ORDER.reference}`, setup({ customerOrder: { paymentsPaused: true, instructions: null } }))
    expect(await screen.findByRole('note')).toHaveTextContent(/Payments are paused for this order/)
    expect(screen.queryByRole('heading', { name: 'Bank transfer details' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'I have paid' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Add a receipt')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeEnabled()
  })
})

/* ---------------- Admin dashboard inside the MyLinnnk app ---------------- */

describe('admin dashboard: part of the MyLinnnk app', () => {
  it('shows gate screens (sign in, no access) inside the site’s own header, card and footer', async () => {
    renderApp('/admin', setup({ signedIn: false }))
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'MyLinnnk home' })).toHaveAttribute('href', '/') // the site header
    expect(screen.getByRole('contentinfo')).toBeInTheDocument() // the site footer
    expect(screen.getByRole('heading', { level: 1, name: 'Administration' })).toBeInTheDocument()
  })

  it('uses the MyLinnnk logo, and always offers the way back to the main site and to the account', async () => {
    renderApp('/admin', setup({ admin: true }))
    const banner = await screen.findByRole('banner')
    expect(within(banner).getByRole('link', { name: 'MyLinnnk administration overview' })).toHaveAttribute('href', '/admin')
    expect(within(banner).getByText('Admin', { selector: '.adm-top__badge' })).toBeInTheDocument()
    expect(within(banner).getByRole('link', { name: 'View site' })).toHaveAttribute('href', '/')
    const exit = screen.getByRole('navigation', { name: 'Leave administration' })
    expect(within(exit).getByRole('link', { name: /Back to MyLinnnk/ })).toHaveAttribute('href', '/')
    expect(within(exit).getByRole('link', { name: 'Your account' })).toHaveAttribute('href', '/account')
  })

  it('marks the current section in the sidebar', async () => {
    renderApp('/admin/users', setup({ admin: true }))
    const nav = await screen.findByRole('navigation', { name: 'Administration' })
    expect(within(nav).getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
  })

  it('mobile menu: opens and closes with the toggle, closes on Escape (focus returns) and after choosing a section', async () => {
    const { user, location } = renderApp('/admin', setup({ admin: true }))
    const toggle = await screen.findByRole('button', { name: 'Open admin menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    const drawer = document.getElementById(toggle.getAttribute('aria-controls'))
    expect(drawer).toContainElement(screen.getByRole('navigation', { name: 'Administration' }))

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName('Close admin menu')
    await waitFor(() => expect(within(drawer).getByRole('link', { name: 'Overview' })).toHaveFocus())
    await user.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()

    await user.click(toggle)
    await user.click(within(drawer).getByRole('link', { name: 'Transactions' }))
    await waitFor(() => expect(location()).toBe('/admin/transactions'))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('primary actions use the site’s MagneticButton; secondary row actions stay quiet', async () => {
    renderApp('/admin/users', setup({ admin: true }))
    expect(await screen.findByRole('button', { name: 'Search' })).toHaveClass('magnetic-button')
    expect(await screen.findByRole('button', { name: 'Sign Bola out everywhere' })).not.toHaveClass('magnetic-button')
  })
})
