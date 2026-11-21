/**
 * /admin/enquiries: the inbox (cards, filters, search) and one enquiry (status, priority, notes, reply).
 * The server decides access; these tests check what the admin sees and sends.
 */
import 'fake-indexeddb/auto'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

vi.setConfig({ testTimeout: 15000 })

const ENQ = {
  reference: 'ENQ-ABC234',
  type: 'quote',
  status: 'new',
  priority: 'normal',
  name: 'Moses Okon',
  email: 'moses@example.com',
  topic: 'Wedding',
  subject: 'Custom page design',
  notification: 'failed',
  notes: 0,
  createdAt: '2026-11-15T10:00:00.000Z',
  updatedAt: '2026-11-15T10:00:00.000Z',
}
const DETAIL = {
  ...ENQ,
  phone: '+44 20 7946 0000',
  country: 'GB',
  category: null,
  subjectLine: null,
  message: null,
  occasion: { value: 'wedding', label: 'Wedding' },
  service: { value: 'custom-design', label: 'Custom page design' },
  description: 'A wedding page with our story and photos.',
  budget: { value: 'standard', label: 'Standard: a polished page with custom touches' },
  timeline: null,
  context: { plan: 'special-request', page: 'mylinnnk.com/p/moses' },
  notification: { state: 'failed', attempts: 1, sentAt: null },
  notes: [],
  fromAccount: true,
  acknowledgement: 'account',
  replies: [{ id: 'r0', requestId: 'first-request', at: '2026-11-15T10:30:00.000Z', text: 'Thank you, we are looking into it.', email: 'sent' }],
}
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function setup({ admin = true, failReplies: failing = 0 } = {}) {
  let failReplies = failing
  const api = createFakeAuthApi()
  api.signIn(api.addUser({ email: 'support@dmclimited.net', displayName: 'Support', emailVerified: true, admin }))
  const calls = []
  let detail = structuredClone(DETAIL)
  const base = api.fetch
  api.fetch = async (url, init = {}) => {
    const u = new URL(url, 'http://localhost')
    const path = u.pathname.replace(/^\/api\/v1/, '')
    const method = init.method ?? 'GET'
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    if (path.startsWith('/admin')) {
      calls.push({ method, path, query: Object.fromEntries(u.searchParams), body, csrf: init.headers?.['X-CSRF-Token'] })
      if (!admin) return json(403, { error: { code: 'NOT_AN_ADMIN', message: 'You don’t have access to administration.' } })
      if (path === '/admin/me') return json(200, { data: { user: { id: 'u1', displayName: 'Support', email: 'support@dmclimited.net' }, role: 'admin' } })
      if (path === '/admin/enquiries') {
        return json(200, { data: { items: [ENQ], total: 1, page: 1, pageSize: 25, summary: { byStatus: { new: 3, in_progress: 1, responded: 2, closed: 4 }, byType: { contact: 6, quote: 4 }, notificationFailed: 1 } } })
      }
      if (path === `/admin/enquiries/${ENQ.reference}` && method === 'GET') {
        return json(200, { data: { enquiry: detail, context: { account: { id: 'u9', displayName: 'Moses Okon', emailVerified: true, since: '2026-11-01T00:00:00.000Z' }, publications: [{ slug: 'moses', status: 'active', suspended: false }], orders: [{ reference: 'MLK-NK8W-XBZU', status: 'approved', plan: 'Celebration', createdAt: '2026-11-14T00:00:00.000Z' }], mentionedPage: null } } })
      }
      if (path === `/admin/enquiries/${ENQ.reference}` && method === 'PATCH') {
        detail = { ...detail, ...body }
        return json(200, { data: { enquiry: detail } })
      }
      if (path === `/admin/enquiries/${ENQ.reference}/replies` && method === 'POST') {
        if (failReplies > 0) {
          failReplies -= 1
          return json(503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'Please try again in a moment.' } })
        }
        if (detail.replies.some((r) => r.requestId === body.requestId)) return json(200, { data: { enquiry: detail, duplicate: true } })
        detail = { ...detail, status: 'responded', replies: [...detail.replies, { id: `r${detail.replies.length + 1}`, requestId: body.requestId, at: '2026-11-15T12:00:00.000Z', text: body.text, email: 'queued' }] }
        return json(201, { data: { enquiry: detail, duplicate: false } })
      }
      if (path === `/admin/enquiries/${ENQ.reference}/notes` && method === 'POST') {
        detail = { ...detail, notes: [...detail.notes, { id: 'n1', at: '2026-11-15T11:00:00.000Z', authorName: 'Support', text: body.text }] }
        return json(201, { data: { enquiry: detail } })
      }
      return json(404, { error: { code: 'NOT_FOUND', message: 'Not found.' } })
    }
    return base(url, init)
  }
  return { api, calls }
}

describe('admin enquiry inbox', () => {
  it('shows summary cards, the list, filters and search; sends filters to the server', async () => {
    const { api, calls } = setup()
    const { user } = renderApp('/admin/enquiries', { api })
    expect(await screen.findByRole('heading', { level: 1, name: 'Enquiries' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'ENQ-ABC234' })).toHaveAttribute('href', '/admin/enquiries/ENQ-ABC234')
    expect(screen.getByText('Inbox email failed')).toBeInTheDocument()
    const newCard = screen.getByRole('button', { name: /New\s*3/ })
    await user.click(newCard)
    await waitFor(() => expect(calls.at(-1).query).toMatchObject({ status: 'new' }))
    await user.click(screen.getByRole('button', { name: 'Quote requests' }))
    await waitFor(() => expect(calls.at(-1).query).toMatchObject({ type: 'quote', status: 'new' }))
    await user.selectOptions(screen.getByLabelText('Priority'), 'urgent')
    await waitFor(() => expect(calls.at(-1).query).toMatchObject({ priority: 'urgent' }))
    await user.type(screen.getByLabelText('Search by reference, name or email'), 'moses@')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(calls.at(-1).query).toMatchObject({ q: 'moses@' }))
    expect(screen.getByRole('link', { name: 'Enquiries' })).toHaveAttribute('aria-current', 'page')
  })

  it('one enquiry: details, context, reply link, status, priority and private notes (with the CSRF token)', async () => {
    const { api, calls } = setup()
    const { user } = renderApp('/admin/enquiries/ENQ-ABC234', { api })
    expect(await screen.findByText('A wedding page with our story and photos.')).toBeInTheDocument()
    expect(screen.getByText(/Not delivered: reply from here/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'MLK-NK8W-XBZU' })).toHaveAttribute('href', '/admin/payments/MLK-NK8W-XBZU')
    const reply = new URL(screen.getByRole('link', { name: 'Open in email app' }).getAttribute('href'))
    expect(reply.protocol).toBe('mailto:')
    expect(decodeURIComponent(reply.pathname)).toBe('moses@example.com')
    expect(reply.searchParams.get('subject')).toBe('Re: Your quote request [ENQ-ABC234]')

    await user.selectOptions(screen.getByLabelText('Priority'), 'high')
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({ body: { priority: 'high' } }))
    expect(calls.find((c) => c.method === 'PATCH').csrf).toBe(api.state.session.csrfToken)
    await user.click(screen.getByRole('button', { name: 'Mark as responded' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH').at(-1).body).toEqual({ status: 'responded' }))

    await user.type(screen.getByLabelText('Add a note'), 'They will send photos by Friday.')
    await user.click(screen.getByRole('button', { name: 'Save note' }))
    expect(await screen.findByText('They will send photos by Friday.')).toBeInTheDocument()
    const notePost = calls.find((c) => c.path.endsWith('/notes'))
    expect(notePost).toMatchObject({ method: 'POST', body: { text: 'They will send photos by Friday.' } })
    expect(notePost.csrf).toBe(api.state.session.csrfToken)
  })

  it('replies: shows the history and email state, sends a reply with the CSRF token and a request id', async () => {
    const { api, calls } = setup()
    const { user } = renderApp('/admin/enquiries/ENQ-ABC234', { api })
    const history = await screen.findByRole('list', { name: 'Reply history' })
    expect(within(history).getByText('Thank you, we are looking into it.')).toBeInTheDocument()
    expect(within(history).getByText(/Email sent/)).toBeInTheDocument()
    expect(screen.getByText('Sent while signed in')).toBeInTheDocument()
    expect(screen.getByText('Sent to their account')).toBeInTheDocument()
    expect(screen.getByText(/Replies are emailed to moses@example.com from MyLinnnk Support and also shown/)).toBeInTheDocument()

    const box = screen.getByLabelText('Your reply')
    expect(box).toHaveAccessibleDescription(/The customer receives exactly this text/)
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
    await user.type(box, 'Your photos arrived. The page will be ready on Friday.')
    expect(screen.getByText(/54 of 5,000 characters/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send reply' }))
    const confirmation = await screen.findByText('Reply sent to the customer.')
    // Shown next to the reply form (where the admin is), not at the top of the page.
    expect(confirmation.closest('form')).toBe(screen.getByLabelText('Your reply').closest('form'))
    const sent = calls.find((c) => c.path.endsWith('/replies'))
    expect(sent).toMatchObject({ method: 'POST', body: { text: 'Your photos arrived. The page will be ready on Friday.' } })
    expect(sent.body.requestId).toMatch(/^[A-Za-z0-9-]{8,64}$/)
    expect(sent.csrf).toBe(api.state.session.csrfToken)
    expect(await within(screen.getByRole('list', { name: 'Reply history' })).findByText('Your photos arrived. The page will be ready on Friday.')).toBeInTheDocument()
    expect(screen.getByLabelText('Your reply')).toHaveValue('')
  })

  it('replies: a failed send keeps the text and retries with the same request id; the next reply gets a new one', async () => {
    const { api, calls } = setup({ failReplies: 1 })
    const { user } = renderApp('/admin/enquiries/ENQ-ABC234', { api })
    await user.type(await screen.findByLabelText('Your reply'), 'We have checked this.')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))
    expect(await screen.findByText('Please try again in a moment.')).toBeInTheDocument()
    expect(screen.getByLabelText('Your reply')).toHaveValue('We have checked this.')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))
    expect(await screen.findByText('Reply sent to the customer.')).toBeInTheDocument()
    const [first, second] = calls.filter((c) => c.path.endsWith('/replies'))
    expect(second.body.requestId).toBe(first.body.requestId)
    await user.type(screen.getByLabelText('Your reply'), 'One more thing.')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))
    await waitFor(() => expect(calls.filter((c) => c.path.endsWith('/replies'))).toHaveLength(3))
    expect(calls.filter((c) => c.path.endsWith('/replies'))[2].body.requestId).not.toBe(first.body.requestId)
  })

  it('a signed-in non-admin sees no enquiry data (the server refuses)', async () => {
    const { api } = setup({ admin: false })
    renderApp('/admin/enquiries', { api })
    expect(await screen.findByText(/No access|don’t have access/i)).toBeInTheDocument()
    expect(screen.queryByText('ENQ-ABC234')).not.toBeInTheDocument()
    expect(within(document.body).queryByText('moses@example.com')).not.toBeInTheDocument()
  })
})
