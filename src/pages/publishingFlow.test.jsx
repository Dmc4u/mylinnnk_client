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
  // A live 60-minute window from the server, relative to when the tests run.
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  serverNow: new Date().toISOString(),
  canRetry: false,
  previousReference: null,
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

/** The customer has uploaded their transfer receipt (needed before “I have paid”). */
const WITH_RECEIPT = { receipts: [{ receiptId: 'rcpt_0123456789abcdef', contentType: 'image/webp', bytes: 4096, uploadedAt: '2026-11-12T10:00:00.000Z' }] }

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The fake auth API plus the admin and payment endpoints these screens use. */
function setup({ admin = false, signedIn = true, checkout = null, adminErrors = {}, customerOrder = {}, submitError = null, afterSubmitError = null, publicationStatus = 'draft', orderError = null, retryWindowMs = 3600_000 } = {}) {
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
      if (path === `/admin/payments/${ORDER.reference}/reject` && method === 'POST') {
        order.admin = { ...order.admin, status: 'rejected', review: { decision: 'rejected', decidedAt: new Date().toISOString(), reason: body.reason } }
        return json(200, { data: { order: order.admin } })
      }
      const own = /^\/admin\/my-pages\/[^/]+\/(publish|extend|update-content)$/.exec(path)
      if (own && method === 'POST') {
        if (own[1] === 'update-content' && body.confirmSlug !== 'ada-and-tunde') return json(409, { error: { code: 'CONFIRMATION_REQUIRED', message: 'Type the page address to confirm.' } })
        const expiresAt = body.expiry?.mode === 'days' ? new Date(Date.now() + body.expiry.days * 86400000).toISOString() : null
        return json(200, { data: { publication: { slug: 'ada-and-tunde', path: '/p/ada-and-tunde', status: 'active', effectiveStatus: 'active', publiclyVisible: true, complimentary: true, activatedAt: new Date().toISOString(), expiresAt } } })
      }
      return json(404, { error: { code: 'NOT_FOUND', message: 'Not found.' } })
    }
    if (path === `/orders/${CUSTOMER_ORDER.reference}`) return json(200, { data: { order: order.customer } })
    if (path === `/orders/${CUSTOMER_ORDER.reference}/retry` && method === 'POST') {
      order.retried = { ...structuredClone(CUSTOMER_ORDER), reference: 'MLK-NEWW-2222', previousReference: CUSTOMER_ORDER.reference, expiresAt: new Date(Date.now() + retryWindowMs).toISOString(), serverNow: new Date().toISOString() }
      return json(201, { data: { order: order.retried } })
    }
    if (path === '/orders/MLK-NEWW-2222' && order.retried) return json(200, { data: { order: order.retried } })
    if (path === `/orders/${CUSTOMER_ORDER.reference}/submit` && method === 'POST' && submitError) {
      if (afterSubmitError) order.customer = { ...order.customer, ...afterSubmitError }
      return json(submitError.status, { error: submitError })
    }
    if (path === `/orders/${CUSTOMER_ORDER.reference}/submit` && method === 'POST') {
      order.customer = { ...order.customer, status: 'submitted', message: 'Payment under review. We’ll check our bank account for your transfer.', submission: { ...body, submittedAt: new Date().toISOString() } }
      return json(200, { data: { order: order.customer } })
    }
    if (path === `/orders/${CUSTOMER_ORDER.reference}/receipts` && method === 'PUT') {
      order.customer = { ...order.customer, receipts: [{ receiptId: 'rcpt_0123456789abcdef', contentType: 'image/webp', bytes: 4096, uploadedAt: new Date().toISOString() }] }
      return json(201, { data: { order: order.customer, receipt: order.customer.receipts[0] } })
    }
    if (path === '/orders') return json(200, { data: { orders: [order.customer] } })
    if (/^\/pages\/[^/]+\/publication$/.test(path)) return json(200, { data: { publication: { slug: 'ada-and-tunde', path: '/p/ada-and-tunde', status: publicationStatus } } })
    if (/^\/pages\/[^/]+\/orders$/.test(path) && method === 'POST') {
      // Like the API: the country is required, and only the API knows where payment is offered.
      if (!body?.country) return json(400, { error: { code: 'VALIDATION_FAILED', message: 'The request is invalid.', details: [{ location: 'body', path: 'country', message: 'Choose your country.' }] } })
      if (body.country !== 'NG') return json(403, { error: { code: 'PAYMENT_NOT_AVAILABLE_IN_COUNTRY', message: 'Sorry, this service is not available in your country yet.' } })
      if (orderError) return json(orderError.status, { error: orderError })
      return json(201, { data: { order: { ...order.customer, kind: publicationStatus === 'active' ? 'renewal' : 'publish' } } })
    }
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
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Overview', 'Users', 'Publications', 'Payment reviews', 'Transactions', 'Enquiries', 'Notifications', 'Email delivery', 'Audit log', 'Settings'])
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

  it('rejecting: the reason field is labelled as customer-visible, limited to 500 characters, and sent with the CSRF token', async () => {
    const { calls, ...rest } = setup({ admin: true })
    const { user } = renderApp(`/admin/payments/${ORDER.reference}`, rest)
    const field = await screen.findByLabelText('Reason for the customer')
    expect(field).toHaveAccessibleDescription(/Customer-visible: shown on their order page and in the email we send them/)
    expect(field).toHaveAttribute('maxLength', '500')
    await user.type(field, 'No transfer with this reference has arrived yet.')
    expect(screen.getByText(/48 of 500 characters/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reject payment' }))
    // The review forms disappear after a decision: focus moves to the confirmation (never lost).
    await waitFor(() => expect(screen.getByText('Payment rejected. The customer can send new details.')).toHaveFocus())
    const call = calls.find((c) => c.path.endsWith('/reject'))
    expect(call.body).toEqual({ reason: 'No transfer with this reference has arrived yet.' })
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
    const { calls, ...rest } = setup({ customerOrder: WITH_RECEIPT })
    const { user } = renderApp(`/orders/${CUSTOMER_ORDER.reference}`, rest)
    expect(await screen.findByText('TEST MODE: these are not real bank details. Do not transfer money.')).toBeInTheDocument()
    expect(screen.getAllByText('₦2,500', { selector: 'dd' })).toHaveLength(2) // amount owed and exact amount to transfer
    expect(screen.getAllByText('MLK-ABCD-EFGH').length).toBeGreaterThan(0)
    await user.type(screen.getByLabelText('Name on the paying account'), 'Ada Obi')
    await user.click(screen.getByRole('button', { name: 'I have paid' }))
    expect(await screen.findByText('Payment Under Review')).toBeInTheDocument()
    const call = calls.find((c) => c.path.endsWith('/submit'))
    expect(Object.keys(call.body).sort()).toEqual(['note', 'payerName', 'transferDate']) // never an amount or a status
  })

  it('needs the transfer receipt before “I have paid”; then shows Payment Under Review', async () => {
    const { calls, ...rest } = setup()
    const { user } = renderApp(`/orders/${CUSTOMER_ORDER.reference}`, rest)
    await screen.findByText(/TEST MODE/)
    const paid = screen.getByRole('button', { name: 'I have paid' })
    expect(paid).toBeDisabled()
    expect(paid).toHaveAccessibleDescription('Upload your transfer receipt first.')
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'receipt.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Add a receipt'), file)
    expect(await screen.findByText('Receipt added.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'I have paid' })).toBeEnabled()
    await user.type(screen.getByLabelText('Name on the paying account'), 'Ada Obi')
    await user.click(screen.getByRole('button', { name: 'I have paid' }))
    expect(await screen.findByText('Payment Under Review')).toBeInTheDocument()
    expect(calls.filter((c) => c.path.endsWith('/submit'))).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'I have paid' })).not.toBeInTheDocument() // can't be reported twice
  })

  it('copies the account number and the reference', async () => {
    // user-event provides the clipboard in tests; read back what the page wrote to it.
    const { user } = renderApp(`/orders/${CUSTOMER_ORDER.reference}`, setup())
    await screen.findByText(/TEST MODE/)
    await user.click(screen.getByRole('button', { name: 'Copy Account Number' }))
    expect(await navigator.clipboard.readText()).toBe('0000000000')
    expect((await screen.findAllByText('Copied')).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Copy reference' }))
    expect(await navigator.clipboard.readText()).toBe('MLK-ABCD-EFGH')
  })

  it('shows the same status when the customer comes back later', async () => {
    renderApp(`/orders/${CUSTOMER_ORDER.reference}`, setup({ customerOrder: { ...WITH_RECEIPT, status: 'under_review', instructions: CUSTOMER_ORDER.instructions } }))
    expect(await screen.findByText('Payment Under Review')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'I have paid' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh status' })).toBeInTheDocument()
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
    // Before checkout: the exact amount payable, in NGN (any US-dollar figure elsewhere is only an estimate).
    expect(screen.getByText(/Amount payable:/)).toHaveTextContent('Amount payable: ₦3,000 (NGN), by bank transfer.')
    await user.click(screen.getByRole('button', { name: 'Get payment details' }))
    await chooseCountry(user, 'Nigeria')
    await user.click(within(countryDialog()).getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(location()).toBe(`/orders/${CUSTOMER_ORDER.reference}`))
    const call = calls.find((c) => c.method === 'POST' && c.path.endsWith('/orders'))
    expect(call.body).toEqual({ planId: 'pro-monthly', country: 'NG' })
  })

  it('publish page: customers never see the administrator panel', async () => {
    renderApp('/publish/665f00000000000000000001', setup({ checkout: { available: true } }))
    expect(await screen.findByRole('radio', { name: /Celebration/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Administrator/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /free of charge/ })).not.toBeInTheDocument()
  })

  it('publish page (admin): publish own page free, after a confirmation, with no end date', async () => {
    const { calls, ...rest } = setup({ admin: true, checkout: { available: true } })
    const { user } = renderApp('/publish/665f00000000000000000001', rest)
    await user.click(await screen.findByRole('button', { name: 'Publish free of charge' }))
    expect(calls.some((c) => c.path.includes('/my-pages/'))).toBe(false) // nothing sent before confirming
    await user.click(screen.getByRole('button', { name: 'Yes, publish now' }))
    expect(await screen.findByText('Published at /p/ada-and-tunde, with no end date.')).toBeInTheDocument()
    const call = calls.find((c) => c.path === '/admin/my-pages/665f00000000000000000001/publish')
    expect(call.body).toEqual({ expiry: { mode: 'none' }, credit: true })
    expect(call.csrf).toBeTruthy()
    expect(calls.some((c) => c.path.endsWith('/orders'))).toBe(false) // no payment order
  })

  it('publish page (admin): replacing a live page’s content needs its address typed back', async () => {
    const { calls, ...rest } = setup({ admin: true, checkout: { available: true }, publicationStatus: 'active' })
    const { user } = renderApp('/publish/665f00000000000000000001', rest)
    const replace = await screen.findByRole('button', { name: 'Replace published content' })
    expect(replace).toBeDisabled()
    await user.type(screen.getByLabelText(/Type the address/), 'ada-and-tunde')
    expect(replace).toBeEnabled()
    await user.click(replace)
    expect(await screen.findByText('The page at /p/ada-and-tunde now shows your latest saved draft.')).toBeInTheDocument()
    expect(calls.find((c) => c.path.endsWith('/update-content')).body).toEqual({ confirmSlug: 'ada-and-tunde' })
  })

  it('publish page: unavailable while the server doesn’t offer checkout', async () => {
    renderApp('/publish/665f00000000000000000001', setup())
    expect(await screen.findByText(/Paid publishing isn’t available yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Get payment details' })).toBeDisabled()
    expect(screen.queryByRole('dialog', { name: 'What is your country?' })).not.toBeInTheDocument()
  })
})

/* ---------------- Country before payment ---------------- */

const countryDialog = () => screen.getByRole('dialog', { name: 'What is your country?' })
async function chooseCountry(user, name) {
  const input = within(await screen.findByRole('dialog', { name: 'What is your country?' })).getByRole('combobox', { name: 'Country' })
  await user.clear(input)
  await user.type(input, name)
  await user.click(within(countryDialog()).getByRole('option', { name }))
}
const PUBLISH = '/publish/665f00000000000000000001'
const AVAILABLE = { checkout: { available: true, test: true, message: 'Test mode' } }

describe('country before payment', () => {
  async function openDialog(options = {}) {
    const { calls, ...rest } = setup({ ...AVAILABLE, ...options })
    const view = renderApp(PUBLISH, rest)
    await view.user.click(await screen.findByRole('radio', { name: /Celebration/ }))
    await view.user.click(screen.getByRole('button', { name: 'Get payment details' }))
    await screen.findByRole('dialog', { name: 'What is your country?' })
    return { ...view, calls, orderCalls: () => calls.filter((c) => c.method === 'POST' && c.path.endsWith('/orders')) }
  }

  it('asks first, and needs a country before continuing', async () => {
    const { user, orderCalls } = await openDialog()
    expect(orderCalls()).toHaveLength(0) // nothing is ordered by opening the dialog
    await user.click(within(countryDialog()).getByRole('button', { name: 'Continue' }))
    expect(within(countryDialog()).getByRole('alert')).toHaveTextContent('Choose your country to continue.')
    expect(orderCalls()).toHaveLength(0)
  })

  it('searches every country by name, code or common name, with the keyboard', async () => {
    const { user } = await openDialog()
    const input = within(countryDialog()).getByRole('combobox', { name: 'Country' })
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    await user.click(input)
    expect(within(countryDialog()).getAllByRole('option')).toHaveLength(249)
    await user.type(input, 'nig')
    expect(within(countryDialog()).getAllByRole('option').map((o) => o.textContent)).toEqual(['Niger', 'Nigeria'])
    await user.keyboard('{ArrowDown}')
    expect(input.getAttribute('aria-activedescendant')).toBe(within(countryDialog()).getByRole('option', { name: 'Nigeria' }).id)
    await user.keyboard('{Enter}')
    expect(input).toHaveValue('Nigeria')
    expect(input).toHaveAttribute('aria-expanded', 'false')

    await user.clear(input)
    await user.type(input, 'uk')
    expect(within(countryDialog()).getByRole('option', { name: 'United Kingdom' })).toBeInTheDocument()
    await user.clear(input)
    await user.type(input, 'cote')
    expect(within(countryDialog()).getByRole('option', { name: /Côte d’Ivoire/ })).toBeInTheDocument()
    await user.keyboard('{Escape}') // closes the list, not the dialog
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(countryDialog()).toBeInTheDocument()
    await user.clear(input)
    await user.type(input, 'zzzz')
    expect(within(countryDialog()).getByText(/No country matches/)).toBeInTheDocument()
  })

  it('an eligible country continues to the bank-transfer order with the chosen plan', async () => {
    const { user, location, orderCalls } = await openDialog()
    await chooseCountry(user, 'Nigeria')
    await user.click(within(countryDialog()).getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(location()).toBe(`/orders/${CUSTOMER_ORDER.reference}`))
    expect(orderCalls()[0].body).toEqual({ planId: 'celebration', country: 'NG' })
    expect(await screen.findByText('TEST BANK (NOT A REAL ACCOUNT)')).toBeInTheDocument()
  })

  it('anywhere else: the one message, Request a Quote and Contact Us, no order and nothing about other countries', async () => {
    const { user, location, orderCalls } = await openDialog()
    await chooseCountry(user, 'United Kingdom')
    await user.click(within(countryDialog()).getByRole('button', { name: 'Continue' }))
    const dialog = countryDialog()
    expect(await within(dialog).findByText('Sorry, this service is not available in your country yet.')).toBeInTheDocument()
    expect(orderCalls()).toHaveLength(1)
    expect(orderCalls()[0].body).toEqual({ planId: 'celebration', country: 'GB' })
    expect(location()).toBe(PUBLISH) // no order page
    expect(dialog.textContent).not.toMatch(/nigeria|supported|only|eligible|bank|account number/i)
    expect(document.body.textContent).not.toMatch(/TEST BANK|MLK-/)

    const quote = within(dialog).getByRole('link', { name: 'Request a Quote' })
    // Both go to MyLinnnk's own pages; the quote form receives what the customer was buying.
    const quoteUrl = new URL(quote.getAttribute('href'), 'http://localhost')
    expect(quoteUrl.pathname).toBe('/request-quote')
    expect(Object.fromEntries(quoteUrl.searchParams)).toEqual({ plan: 'celebration', page: 'mylinnnk.com/p/ada-and-tunde', country: 'GB' })
    const contact = within(dialog).getByRole('link', { name: 'Contact Us' })
    expect(contact.getAttribute('href')).toBe('/contact')

    // Closing keeps the page as it was: same draft, same plan, nothing ordered.
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'What is your country?' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Celebration/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Get payment details' })).toBeEnabled()
  })

  it('renewals ask too; another country can be chosen after the message', async () => {
    const { user, location, orderCalls } = await openDialog({ publicationStatus: 'active' })
    expect(screen.getByText(/fixed while it’s being paid for or published/)).toBeInTheDocument()
    await chooseCountry(user, 'Kenya')
    await user.click(within(countryDialog()).getByRole('button', { name: 'Continue' }))
    expect(await within(countryDialog()).findByText('Sorry, this service is not available in your country yet.')).toBeInTheDocument()
    await user.click(within(countryDialog()).getByRole('button', { name: 'Choose a different country' }))
    await chooseCountry(user, 'Nigeria')
    await user.click(within(countryDialog()).getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(location()).toBe(`/orders/${CUSTOMER_ORDER.reference}`))
    expect(orderCalls().map((c) => c.body.country)).toEqual(['KE', 'NG'])
  })

  it('remembers the answer when the dialog is opened again on the same page', async () => {
    const { user } = await openDialog()
    await chooseCountry(user, 'Ghana')
    await user.click(within(countryDialog()).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Get payment details' }))
    expect(within(await screen.findByRole('dialog', { name: 'What is your country?' })).getByRole('combobox', { name: 'Country' })).toHaveValue('')
    await chooseCountry(user, 'Ghana')
    await user.click(within(countryDialog()).getByRole('button', { name: 'Continue' }))
    await within(countryDialog()).findByText('Sorry, this service is not available in your country yet.')
    await user.click(within(countryDialog()).getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'Get payment details' }))
    expect(within(await screen.findByRole('dialog', { name: 'What is your country?' })).getByRole('combobox', { name: 'Country' })).toHaveValue('Ghana')
  })

  it('other problems close the dialog and show on the page as before', async () => {
    const { user, location } = await openDialog({ orderError: { status: 409, code: 'ORDER_ALREADY_OPEN', message: 'This page already has a payment in progress.' } })
    await chooseCountry(user, 'Nigeria')
    await user.click(within(countryDialog()).getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(/This page already has a payment in progress\./)).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'What is your country?' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See your payments' })).toBeInTheDocument()
    expect(location()).toBe(PUBLISH)
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
    const { calls, ...rest } = setup({ customerOrder: WITH_RECEIPT })
    const { user } = renderApp(`/orders/${CUSTOMER_ORDER.reference}`, rest)
    await screen.findByText(/TEST MODE/)
    const date = screen.getByLabelText('Transfer date')
    expect(date).toHaveValue(localToday())
    expect(date).toHaveAttribute('max', localToday())
    expect(date).toHaveAccessibleDescription('The day your bank shows for the transfer.')
    await user.type(screen.getByLabelText('Name on the paying account'), 'Ada Obi')
    await user.click(screen.getByRole('button', { name: 'I have paid' }))
    await screen.findByText('Payment Under Review')
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
      setup({ customerOrder: WITH_RECEIPT, submitError: { status: 409, code: 'ORDER_EXPIRED', message: 'This order passed its payment deadline, so it has expired.' }, afterSubmitError: expired }),
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
    expect(within(exit).getByRole('link', { name: 'Your account' })).toHaveAttribute('href', '/dashboard')
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

/* ---------------- 60-minute payment window ---------------- */

describe('payment window countdown and “Try again”', () => {
  it('shows a MM:SS countdown from the server’s deadline (60:00 at the start)', async () => {
    const now = new Date()
    renderApp(`/orders/${CUSTOMER_ORDER.reference}`, setup({ customerOrder: { expiresAt: new Date(now.getTime() + 3600_000).toISOString(), serverNow: now.toISOString() } }))
    const timer = await screen.findByRole('timer')
    expect(timer.textContent).toMatch(/^(60:00|59:59)$/)
    expect(screen.getByText('Time left to pay')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'I have paid' })).toBeInTheDocument()
  })

  it('the countdown follows the server’s clock, not the device’s (a wrong device clock changes nothing)', async () => {
    const serverNow = new Date(Date.now() - 2 * 3600_000) // the device is 2 hours fast
    renderApp(`/orders/${CUSTOMER_ORDER.reference}`, setup({ customerOrder: { expiresAt: new Date(serverNow.getTime() + 25 * 60_000).toISOString(), serverNow: serverNow.toISOString() } }))
    expect((await screen.findByRole('timer')).textContent).toMatch(/^(25:00|24:59)$/)
  })

  it('an expired order: “Payment Expired”, no payment controls or bank details, and Try Again opens a new order', async () => {
    const { calls, ...rest } = setup({ customerOrder: { status: 'expired', expiresAt: null, canRetry: true, message: 'This payment window has closed.' } })
    const { user, location } = renderApp(`/orders/${CUSTOMER_ORDER.reference}`, rest)
    expect(await screen.findByRole('heading', { name: 'Payment Expired' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'I have paid' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Add a receipt/)).not.toBeInTheDocument()
    expect(screen.queryByText('Bank transfer details')).not.toBeInTheDocument()
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.getByText(/mention MLK-ABCD-EFGH in the note/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try Again / Create New Payment' }))
    await waitFor(() => expect(location()).toBe('/orders/MLK-NEWW-2222'))
    expect(await screen.findByText('New payment for expired order MLK-ABCD-EFGH.')).toBeInTheDocument()
    expect((await screen.findByRole('timer')).textContent).toMatch(/^(60:00|59:5\d)$/)
    const call = calls.find((c) => c.path === `/orders/${CUSTOMER_ORDER.reference}/retry`)
    expect(call.method).toBe('POST')
    expect(call.csrf).toBeTruthy()
  })

  it('reported as paid: no countdown and no Try Again, even after the deadline (an admin decides)', async () => {
    renderApp(`/orders/${CUSTOMER_ORDER.reference}`, setup({ customerOrder: { status: 'submitted', expiresAt: null, message: 'Payment under review.' } }))
    expect(await screen.findByText('Payment under review.')).toBeInTheDocument()
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Try Again/ })).not.toBeInTheDocument()
  })
})

describe('3-minute payment window: the lifecycle in one signed-in session (real time)', () => {
  it('counts down, expires at zero (server confirms), Try Again opens a new order with a fresh 03:00, still signed in', async () => {
    // The last five seconds of a 3-minute order: the server's clock says 2:55 have passed.
    const serverNow = new Date()
    const { calls, api } = setup({ retryWindowMs: 180_000, customerOrder: { expiresAt: new Date(serverNow.getTime() + 5000).toISOString(), serverNow: serverNow.toISOString() } })
    // After the deadline the server reports the order as expired (it records it when asked).
    const base = api.fetch
    let reads = 0
    api.fetch = async (url, init = {}) => {
      const path = new URL(url, 'http://localhost').pathname
      if (path === `/api/v1/orders/${CUSTOMER_ORDER.reference}` && (init.method ?? 'GET') === 'GET' && ++reads > 1) {
        return new Response(JSON.stringify({ data: { order: { ...CUSTOMER_ORDER, status: 'expired', expiresAt: null, canRetry: true, serverNow: new Date().toISOString(), message: 'This payment window has closed.' } } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return base(url, init)
    }
    const { user, location } = renderApp(`/orders/${CUSTOMER_ORDER.reference}`, { api })
    expect((await screen.findByRole('timer')).textContent).toMatch(/^00:0[1-5]$/)
    expect(screen.getByRole('button', { name: 'I have paid' })).toBeInTheDocument()
    // Zero: payment controls go, the server is asked, "Payment Expired" appears.
    expect(await screen.findByRole('heading', { name: 'Payment Expired' }, { timeout: 9000 })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'I have paid' })).not.toBeInTheDocument()
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.getByText(/The payment window for this order has closed/)).toBeInTheDocument()
    expect(reads).toBeGreaterThanOrEqual(2)
    // Try Again (clicked twice quickly): one request, a new order, a fresh 3 minutes, same session.
    const button = await screen.findByRole('button', { name: 'Try Again / Create New Payment' })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    await user.click(button).catch(() => {})
    await waitFor(() => expect(location()).toBe('/orders/MLK-NEWW-2222'))
    expect((await screen.findByRole('timer')).textContent).toMatch(/^(03:00|02:59)$/)
    expect(screen.getByText('New payment for expired order MLK-ABCD-EFGH.')).toBeInTheDocument()
    expect(calls.filter((c) => c.path === `/orders/${CUSTOMER_ORDER.reference}/retry`)).toHaveLength(1)
    expect(api.state.session).toBeTruthy() // never signed out
    expect(location()).not.toMatch(/login|signup/)
  }, 25000)
})
