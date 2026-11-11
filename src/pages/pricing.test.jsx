/**
 * Pricing (Phase 5, Stage 1): plans and prices come from GET /api/v1/plans;
 * choosing a plan only selects it (no checkout, no orders, no publishing).
 */
import 'fake-indexeddb/auto'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PLANS_FIXTURE from '../test/fixtures/plans.json'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

vi.setConfig({ testTimeout: 15000 })

const deck = () => screen.getByRole('list', { name: 'Publishing plans' })
const card = (name) => screen.getByRole('article', { name })
const writes = (api) => api.state.requests.filter((r) => r.method !== 'GET')

async function openPricing(path = '/pricing', api = createFakeAuthApi()) {
  const utils = renderApp(path, { api })
  await screen.findByRole('list', { name: 'Publishing plans' })
  return utils
}

describe('pricing page', () => {
  it('shows the five fixed-price plans in naira and Special Request as a custom quote', async () => {
    await openPricing()
    const items = within(deck()).getAllByRole('listitem').filter((li) => li.dataset.plan)
    expect(items.map((li) => li.dataset.plan)).toEqual(['free', 'celebration', 'pro-starter', 'pro-monthly', 'pro-annual'])

    const amounts = {
      'Free Editor': '₦0',
      Celebration: '₦2,500',
      'Professional Starter': '₦7,500',
      'Professional Monthly': '₦3,000',
      'Professional Annual': '₦24,000',
    }
    for (const [name, amount] of Object.entries(amounts)) expect(within(card(name)).getByText(amount)).toBeInTheDocument()

    const custom = screen.getByRole('region', { name: 'Special Request' })
    expect(within(custom).getByText('Custom quote')).toBeInTheDocument()
    expect(within(custom).queryByText(/₦/)).not.toBeInTheDocument()
  })

  it('describes validity and renewal honestly, including for screen readers', async () => {
    await openPricing()
    expect(within(card('Celebration')).getByText('Pay once · live for 30 days · never renews')).toBeInTheDocument()
    expect(within(card('Professional Starter')).getByText('Pay once · live for 90 days · never renews')).toBeInTheDocument()
    expect(within(card('Professional Monthly')).getByText('₦3,000 for 30 days, renewed manually')).toHaveClass('sr-only')
    expect(within(card('Professional Annual')).getByText(/Live for 365 days per payment · renew manually · never charged automatically/)).toBeInTheDocument()
    expect(within(card('Free Editor')).getByText('Drafts only · no publishing')).toBeInTheDocument()
  })

  it('features Professional Monthly and shows the annual saving (33%)', async () => {
    await openPricing()
    expect(within(card('Professional Monthly')).getByText('Most popular')).toBeInTheDocument()
    expect(screen.getAllByText('Most popular')).toHaveLength(1)
    const annual = card('Professional Annual')
    expect(within(annual).getByText('Save 33%')).toBeInTheDocument()
    expect(within(annual).getByText(/₦12,000 less than 12 monthly payments/)).toBeInTheDocument()
    expect(within(annual).getByText(/₦36,000/)).toBeInTheDocument()
  })

  it('takes every price from the server (nothing hardcoded)', async () => {
    const api = createFakeAuthApi()
    const changed = structuredClone(PLANS_FIXTURE)
    changed.plans.find((p) => p.id === 'celebration').price.amountMinor = 260_000
    const base = api.fetch
    api.fetch = async (url, init) =>
      String(url).endsWith('/plans') ? new Response(JSON.stringify({ data: changed }), { status: 200, headers: { 'content-type': 'application/json' } }) : base(url, init)
    await openPricing('/pricing', api)
    expect(within(card('Celebration')).getByText('₦2,600')).toBeInTheDocument()
    expect(screen.queryByText('₦2,500')).not.toBeInTheDocument()
  })

  it('shows a loading state, then the plans (one shared request)', async () => {
    const api = createFakeAuthApi()
    api.state.plansDelay = 150
    renderApp('/pricing', { api })
    expect(screen.getByRole('status')).toHaveTextContent('Loading prices…')
    expect(screen.queryByText('₦3,000')).not.toBeInTheDocument()
    await screen.findByRole('list', { name: 'Publishing plans' })
    expect(api.requestsTo('/plans')).toHaveLength(1)
  })

  it('explains a failure without inventing prices, and retries', async () => {
    const api = createFakeAuthApi()
    api.state.plansDown = true
    const { user } = renderApp('/pricing', { api })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('We couldn’t load the prices right now.')
    expect(screen.queryByText(/₦/)).not.toBeInTheDocument()
    api.state.plansDown = false
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))
    await screen.findByRole('list', { name: 'Publishing plans' })
    expect(within(card('Celebration')).getByText('₦2,500')).toBeInTheDocument()
  })

  it('selects a plan without buying anything, and keeps the choice in the address', async () => {
    const { api, user, location } = await openPricing()
    const choose = within(card('Professional Monthly')).getByRole('button', { name: 'Choose Professional Monthly plan' })
    expect(choose).toHaveAttribute('aria-pressed', 'false')
    await user.click(choose)
    expect(choose).toHaveAttribute('aria-pressed', 'true')
    expect(location()).toBe('/pricing?plan=pro-monthly')

    const notice = screen.getByText(/Professional Monthly selected/).closest('[role="status"]')
    expect(notice).toHaveTextContent('nothing is charged and no page is published yet')
    expect(within(notice).getByRole('link', { name: 'Start with a template' })).toHaveAttribute('href', '/templates')

    // Choosing another plan moves the selection.
    await user.click(within(card('Celebration')).getByRole('button', { name: 'Choose Celebration plan' }))
    expect(choose).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1)

    expect(writes(api)).toEqual([]) // no order, no payment, nothing saved
    expect(screen.queryByRole('button', { name: /pay|checkout|buy|purchase/i })).not.toBeInTheDocument()
  })

  it('can be used with the keyboard alone', async () => {
    const { user } = await openPricing()
    const choose = within(card('Professional Annual')).getByRole('button', { name: 'Choose Professional Annual plan' })
    choose.focus()
    await user.keyboard('{Enter}')
    expect(choose).toHaveAttribute('aria-pressed', 'true')
    const starter = within(card('Professional Starter')).getByRole('button', { name: 'Choose Professional Starter plan' })
    starter.focus()
    await user.keyboard(' ')
    expect(starter).toHaveAttribute('aria-pressed', 'true')
  })

  it('restores a valid ?plan= and ignores an unknown one', async () => {
    await openPricing('/pricing?plan=celebration')
    expect(within(card('Celebration')).getByRole('button', { name: /Choose Celebration/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('ignores an unknown ?plan=', async () => {
    await openPricing('/pricing?plan=enterprise')
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
  })

  it('keeps the Free Editor workflow: "Start free" opens the template gallery', async () => {
    const { user, location } = await openPricing()
    await user.click(within(card('Free Editor')).getByRole('link', { name: 'Start free' }))
    await waitFor(() => expect(location()).toBe('/templates'))
  })

  it('lets you ask for a Special Request quote (coming soon, nothing sent)', async () => {
    const { api, user } = await openPricing()
    await user.click(screen.getByRole('button', { name: 'Request a quote' }))
    expect(screen.getByRole('button', { name: 'Request a quote' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Custom quotes open soon/)).toBeInTheDocument()
    expect(writes(api)).toEqual([])
  })

  it('says paid publishing is coming soon', async () => {
    await openPricing()
    expect(screen.getByText(/Paid publishing is coming soon/)).toBeInTheDocument()
  })

  it('shows the plans at once when reduced motion is requested', async () => {
    const original = window.matchMedia
    window.matchMedia = (query) => ({ ...original(query), matches: query.includes('prefers-reduced-motion') })
    try {
      await openPricing()
      await waitFor(() => expect(deck()).toHaveClass('is-in'))
    } finally {
      window.matchMedia = original
    }
  })

  it('is linked from the site navigation', async () => {
    renderApp('/')
    const nav = screen.getAllByRole('link', { name: 'Pricing' })
    expect(nav.length).toBeGreaterThan(0)
    expect(nav[0]).toHaveAttribute('href', '/pricing')
  })
})

describe('editor publish dialog', () => {
  it('shows the server’s prices, suggests the likely plan and still cannot take payment', async () => {
    const { api, user } = renderApp('/editor/garden-vows')
    await user.click(await screen.findByRole('button', { name: 'Publish' }))
    const dialog = await screen.findByRole('dialog', { name: 'Publish your page' })
    const event = within(dialog).getByRole('region', { name: 'Personal event page' })
    expect(within(event).getByText('Likely for this page')).toBeInTheDocument() // garden-vows is a wedding template
    expect(await within(event).findByText('₦2,500')).toBeInTheDocument()
    const pro = within(dialog).getByRole('region', { name: 'Professional page' })
    expect(within(pro).getByText('₦24,000')).toBeInTheDocument()
    expect(within(pro).getByText(/save 33%/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Continue to payment' })).toBeDisabled()
    expect(within(dialog).getByText(/Paid publishing is coming soon/)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Compare all plans' })).toHaveAttribute('href', '/pricing')
    expect(writes(api)).toEqual([])
  })
})
