/**
 * After an approved payment: the order page's "your page is live" view and the account's published
 * pages, driven only by what the server reports (publication.publiclyVisible, publication.url).
 */
import 'fake-indexeddb/auto'
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'
import { emailShareUrl, facebookShareUrl, whatsappShareUrl } from '../utils/share.js'
import { publicationState } from './AccountPage/publicationState.js'

vi.setConfig({ testTimeout: 15000 })

const REF = 'MLK-NK8W-XBZU'
const LIVE_PUB = {
  slug: 'moses',
  path: '/p/moses',
  url: 'http://localhost:3002/p/moses',
  title: 'A Year in Lisbon',
  planName: 'Celebration',
  orderRef: REF,
  status: 'active',
  effectiveStatus: 'active',
  publiclyVisible: true,
  suspended: false,
  activatedAt: '2026-11-14T12:00:00.000Z',
  expiresAt: '2026-12-14T12:00:00.000Z',
  graceEndsAt: '2026-12-15T12:00:00.000Z',
}
const approvedOrder = (publication = LIVE_PUB, site = { origin: 'http://localhost:3002', local: true }) => ({
  reference: REF,
  kind: 'publish',
  status: 'approved',
  message: 'Payment confirmed. Your page is published.',
  plan: { planId: 'celebration', name: 'Celebration', amountMinor: 250000, currency: 'NGN', validityDays: 30 },
  pageId: '665f00000000000000000001',
  isTest: false,
  paymentsPaused: false,
  expiresAt: null,
  submission: { payerName: 'Moses', transferDate: '2026-11-14', note: '', submittedAt: '2026-11-14T11:00:00.000Z' },
  receipts: [{ receiptId: 'rcpt_0123456789abcdef', contentType: 'image/webp', bytes: 4096, uploadedAt: '2026-11-14T10:00:00.000Z' }],
  rejectionReason: null,
  instructions: null,
  publication,
  site,
  createdAt: '2026-11-14T09:00:00.000Z',
  updatedAt: '2026-11-14T12:00:00.000Z',
})

function signedIn(order) {
  const api = createFakeAuthApi()
  api.signIn(api.addUser({ email: 'moses@example.com', displayName: 'Moses', emailVerified: true }))
  if (order) {
    const base = api.fetch
    api.fetch = (url, init) =>
      new URL(url, 'http://localhost').pathname === `/api/v1/orders/${REF}`
        ? Promise.resolve(new Response(JSON.stringify({ data: { order } }), { status: 200, headers: { 'content-type': 'application/json' } }))
        : base(url, init)
  }
  return api
}

describe('order page after approval', () => {
  it('celebrates a live page with its real address, sharing, plan and expiry; payment details stay available', async () => {
    renderApp(`/orders/${REF}`, { api: signedIn(approvedOrder()) })
    expect(await screen.findByRole('heading', { level: 1, name: /Congratulations! Your page is live!/ })).toBeInTheDocument()
    expect(screen.getByText('Your payment has been confirmed and your page is officially published. It’s time to share your special moment with the world!')).toBeInTheDocument()
    const address = screen.getByRole('link', { name: 'http://localhost:3002/p/moses' })
    expect(address).toHaveAttribute('href', 'http://localhost:3002/p/moses')
    expect(screen.getByRole('link', { name: 'View My Page' })).toHaveAttribute('href', 'http://localhost:3002/p/moses')
    expect(screen.getByRole('button', { name: 'Copy Link' })).toBeInTheDocument()
    const share = screen.getByRole('group', { name: 'Share your page' })
    expect(within(share).getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', whatsappShareUrl(LIVE_PUB.url, LIVE_PUB.title))
    expect(within(share).getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', facebookShareUrl(LIVE_PUB.url))
    expect(within(share).getByRole('link', { name: 'Email' })).toHaveAttribute('href', emailShareUrl(LIVE_PUB.url, LIVE_PUB.title))
    expect(screen.getByText('Celebration', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText(new Date(LIVE_PUB.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }))).toBeInTheDocument()
    // Development link: never presented as something other people can open.
    expect(screen.getByRole('note')).toHaveTextContent(/Development link: this address only works on this computer/)
    // Secondary details: the reference and the receipt.
    const details = screen.getByText('Payment details').closest('details')
    expect(within(details).getByText(REF)).toBeInTheDocument()
    expect(within(details).getByRole('link', { name: /Receipt 1/ })).toBeInTheDocument()
  })

  it('copies the link', async () => {
    const { user } = renderApp(`/orders/${REF}`, { api: signedIn(approvedOrder()) })
    await user.click(await screen.findByRole('button', { name: 'Copy Link' }))
    expect(await navigator.clipboard.readText()).toBe('http://localhost:3002/p/moses')
  })

  it('a public site address has no development note', async () => {
    const pub = { ...LIVE_PUB, url: 'https://mylinnnk.com/p/moses' }
    renderApp(`/orders/${REF}`, { api: signedIn(approvedOrder(pub, { origin: 'https://mylinnnk.com', local: false })) })
    expect(await screen.findByRole('link', { name: 'https://mylinnnk.com/p/moses' })).toBeInTheDocument()
    expect(screen.queryByText(/Development link/)).not.toBeInTheDocument()
  })

  it('offers the device’s share sheet where there is one, and falls back gracefully', async () => {
    const share = vi.fn(() => Promise.reject(Object.assign(new Error('nope'), { name: 'NotAllowedError' })))
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    try {
      const { user } = renderApp(`/orders/${REF}`, { api: signedIn(approvedOrder()) })
      await user.click(await screen.findByRole('button', { name: 'More…' }))
      expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: 'http://localhost:3002/p/moses' }))
      expect(await screen.findByText('Sharing isn’t available here. Use Copy Link instead.')).toBeInTheDocument()
    } finally {
      delete navigator.share
    }
  })

  for (const [name, pub, text] of [
    ['suspended', { ...LIVE_PUB, suspended: true, publiclyVisible: false }, /suspended at the moment/],
    ['expired', { ...LIVE_PUB, status: 'expired', effectiveStatus: 'expired', publiclyVisible: false }, /publishing period ended/],
  ]) {
    it(`never says “live” for an approved order whose page is ${name}`, async () => {
      renderApp(`/orders/${REF}`, { api: signedIn(approvedOrder(pub)) })
      expect(await screen.findByText(text)).toBeInTheDocument()
      expect(screen.getByText('Payment confirmed')).toBeInTheDocument()
      expect(screen.queryByText(/Your page is live/)).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'View My Page' })).not.toBeInTheDocument()
    })
  }
})

describe('account: published pages', () => {
  const pages = [
    { ...LIVE_PUB, pageId: '665f00000000000000000001', pageTitle: 'A Year in Lisbon', templateSlug: 'year-in-lisbon', pageDeleted: false },
    { ...LIVE_PUB, slug: 'checking', path: '/p/checking', url: 'http://localhost:3002/p/checking', status: 'pending_review', effectiveStatus: 'pending_review', publiclyVisible: false, orderRef: 'MLK-AAAA-BBBB', pageId: '665f00000000000000000002', pageTitle: 'Being checked', templateSlug: 'garden-vows', pageDeleted: false },
    { ...LIVE_PUB, slug: 'old-one', path: '/p/old-one', url: 'http://localhost:3002/p/old-one', status: 'expired', effectiveStatus: 'expired', publiclyVisible: false, pageId: '665f00000000000000000003', pageTitle: 'Old one', templateSlug: 'garden-vows', pageDeleted: false },
    { ...LIVE_PUB, slug: 'paused', path: '/p/paused', url: 'http://localhost:3002/p/paused', suspended: true, publiclyVisible: false, pageId: '665f00000000000000000004', pageTitle: 'Paused', templateSlug: 'garden-vows', pageDeleted: false },
  ]

  it('shows each page’s real state and the right actions, above the drafts', async () => {
    const api = signedIn()
    api.state.publications = pages
    renderApp('/dashboard/publications', { api })
    const section = await screen.findByRole('region', { name: 'Published pages' })
    await within(section).findByText('A Year in Lisbon')
    expect(screen.queryByRole('region', { name: 'My drafts' })).not.toBeInTheDocument() // drafts have their own view now
    const item = (title) => within(section).getByText(title).closest('li')

    const live = item('A Year in Lisbon')
    expect(within(live).getByText('Live')).toBeInTheDocument()
    expect(within(live).getByRole('link', { name: 'http://localhost:3002/p/moses' })).toBeInTheDocument()
    expect(within(live).getByRole('link', { name: 'View A Year in Lisbon' })).toHaveAttribute('href', LIVE_PUB.url)
    expect(within(live).getByRole('button', { name: 'Copy Link' })).toBeInTheDocument()
    expect(within(live).getByRole('link', { name: 'Edit A Year in Lisbon' })).toHaveAttribute('href', '/editor/year-in-lisbon?page=665f00000000000000000001')
    expect(within(live).getByRole('link', { name: 'Renew A Year in Lisbon' })).toHaveAttribute('href', '/publish/665f00000000000000000001')

    const checking = item('Being checked')
    expect(within(checking).getByText('Payment under review')).toBeInTheDocument()
    expect(within(checking).queryByText('Live')).not.toBeInTheDocument()
    expect(within(checking).queryByRole('button', { name: 'Copy Link' })).not.toBeInTheDocument()
    expect(within(checking).getByRole('link', { name: 'View payment' })).toHaveAttribute('href', '/orders/MLK-AAAA-BBBB')

    const old = item('Old one')
    expect(within(old).getByText('Expired')).toBeInTheDocument()
    expect(within(old).getByRole('link', { name: 'Renew Old one' })).toBeInTheDocument()
    expect(within(old).queryByRole('link', { name: /View Old one/ })).not.toBeInTheDocument()

    const paused = item('Paused')
    expect(within(paused).getByText('Suspended')).toBeInTheDocument()
    expect(within(paused).queryByRole('link', { name: /Renew/ })).not.toBeInTheDocument()
  })

  it('Share opens the sharing options for that page', async () => {
    const api = signedIn()
    api.state.publications = [pages[0]]
    const { user } = renderApp('/dashboard/publications', { api })
    const section = await screen.findByRole('region', { name: 'Published pages' })
    await user.click(await within(section).findByRole('button', { name: 'Share' }))
    const panel = within(section).getByRole('group', { name: 'Share your page' })
    expect(within(panel).getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', whatsappShareUrl(LIVE_PUB.url, 'A Year in Lisbon'))
    expect(within(panel).getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', facebookShareUrl(LIVE_PUB.url))
    expect(within(panel).getByRole('link', { name: 'Email' })).toHaveAttribute('href', emailShareUrl(LIVE_PUB.url, 'A Year in Lisbon'))
    for (const link of within(panel).getAllByRole('link')) expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull() // icon + name
    // No duplicates of the row's own actions, and no button without a name.
    expect(within(section).getAllByRole('button', { name: 'Copy Link' })).toHaveLength(1)
    expect(within(section).queryByRole('link', { name: 'View My Page' })).not.toBeInTheDocument()
    for (const control of within(section).getAllByRole('button')) expect(control).toHaveAccessibleName()
    // Copying confirms visibly and to assistive technology.
    await user.click(within(section).getByRole('button', { name: 'Copy Link' }))
    expect(within(section).getByText('Copied ✓')).toBeInTheDocument()
    expect(within(section).getByRole('status', { name: '' })).toHaveTextContent('Copied')
  })

  it('with no published pages: an empty state that points to publishing', async () => {
    renderApp('/dashboard/publications', { api: signedIn() })
    const section = await screen.findByRole('region', { name: 'Published pages' })
    expect(await within(section).findByText(/No published pages yet/)).toBeInTheDocument()
  })

  it('labels: “Live” only when the server says the page is visible', () => {
    expect(publicationState({ publiclyVisible: true }).label).toBe('Live')
    expect(publicationState({ publiclyVisible: false, effectiveStatus: 'active' }).label).toBe('Not live')
    expect(publicationState({ publiclyVisible: true, suspended: true }).label).toBe('Suspended')
    expect(publicationState({ effectiveStatus: 'grace' }).label).toBe('Expired')
    expect(publicationState({ effectiveStatus: 'unpublished' }).label).toBe('Unpublished')
  })
})

describe('share links', () => {
  it('encode every part', () => {
    const url = 'https://mylinnnk.com/p/sam-and-alex'
    expect(whatsappShareUrl(url, 'Sam & Alex')).toBe(`https://wa.me/?text=${encodeURIComponent(`Sam & Alex: see my page on MyLinnnk ${url}`)}`)
    expect(facebookShareUrl(url)).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fmylinnnk.com%2Fp%2Fsam-and-alex')
    const mail = new URL(emailShareUrl(url, 'Sam & Alex'))
    expect(mail.searchParams.get('subject')).toBe('Sam & Alex')
    expect(mail.searchParams.get('body')).toBe(`Sam & Alex: see my page on MyLinnnk\n\n${url}`)
  })
})
