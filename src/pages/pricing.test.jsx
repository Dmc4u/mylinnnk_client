/**
 * Pricing (Phase 5, Stage 1): plans and prices come from GET /api/v1/plans;
 * choosing a plan only selects it (no checkout, no orders, no publishing).
 */
import 'fake-indexeddb/auto'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getTemplateBySlug } from '../data/templates.js'
import { createPageFromTemplate } from '../editor/model/page.js'
import { EDITABLE_FIELDS } from '../editor/services/cloudDrafts.js'
import PLANS_FIXTURE from '../test/fixtures/plans.json'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

vi.setConfig({ testTimeout: 15000 })

const deck = () => screen.getByRole('list', { name: 'Publishing plans' })
const card = (name) => screen.getByRole('article', { name })
const writes = (api) => api.state.requests.filter((r) => r.method !== 'GET')
/** The button covering a card behind the front one. */
const peek = (name) => screen.getByRole('button', { name: new RegExp(`^${name}, .*Bring to front and select$`) })
const frontPlan = () => deck().querySelector('.plan-card.is-front')?.dataset.plan

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

  it('labels Monthly “Most flexible” and Annual “Best value” (no popularity claim), and shows the annual saving (33%)', async () => {
    await openPricing()
    expect(within(card('Professional Monthly')).getByText('Most flexible')).toBeInTheDocument()
    expect(within(card('Professional Annual')).getByText('Best value')).toBeInTheDocument()
    expect(screen.queryByText('Most popular')).not.toBeInTheDocument()
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
      new URL(String(url), 'http://localhost').pathname.endsWith('/plans') ? new Response(JSON.stringify({ data: changed }), { status: 200, headers: { 'content-type': 'application/json' } }) : base(url, init)
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

  it('starts as a stack with Professional Monthly in front and the others behind it', async () => {
    await openPricing()
    expect(frontPlan()).toBe('pro-monthly')
    const offsets = Object.fromEntries(within(deck()).getAllByRole('listitem').filter((li) => li.dataset.plan).map((li) => [li.dataset.plan, li.style.getPropertyValue('--d')]))
    expect(offsets).toEqual({ free: '2', celebration: '-2', 'pro-starter': '-1', 'pro-monthly': '0', 'pro-annual': '1' })
    // Cards behind are inert; each is reachable through one labelled button instead.
    for (const name of ['Free Editor', 'Celebration', 'Professional Starter', 'Professional Annual']) {
      expect(card(name)).toHaveAttribute('inert')
      expect(peek(name)).toBeInTheDocument()
    }
    expect(card('Professional Monthly')).not.toHaveAttribute('inert')
    expect(peek('Celebration')).toHaveAccessibleName('Celebration, ₦2,500, one-time payment for 30 days. Bring to front and select')
  })

  it('brings a card behind to the front and selects it, keeping the choice in the address', async () => {
    const { api, user, location } = await openPricing()
    await user.click(peek('Celebration'))
    expect(frontPlan()).toBe('celebration')
    expect(location()).toBe('/pricing?plan=celebration')
    expect(card('Celebration')).not.toHaveAttribute('inert')
    expect(card('Professional Monthly')).toHaveAttribute('inert')
    expect(within(card('Celebration')).getByRole('button', { name: 'Choose Celebration plan' })).toHaveAttribute('aria-pressed', 'true')

    const notice = screen.getByText(/Celebration selected/).closest('[role="status"]')
    expect(notice).toHaveTextContent('nothing is charged and no page is published yet')
    expect(within(notice).getByRole('link', { name: 'Start with a template' })).toHaveAttribute('href', '/templates')

    expect(writes(api)).toEqual([]) // no order, no payment, nothing saved
    expect(screen.queryByRole('button', { name: /^(pay|checkout|buy|purchase)/i })).not.toBeInTheDocument()
  })

  it('lets every plan be brought to the front and chosen', async () => {
    const { user, location } = await openPricing()
    for (const [name, id] of [['Free Editor', 'free'], ['Celebration', 'celebration'], ['Professional Starter', 'pro-starter'], ['Professional Annual', 'pro-annual'], ['Professional Monthly', 'pro-monthly']]) {
      if (frontPlan() !== id) await user.click(peek(name))
      expect(frontPlan()).toBe(id)
      expect(location()).toBe(`/pricing?plan=${id}`)
    }
    const choose = within(card('Professional Monthly')).getByRole('button', { name: 'Choose Professional Monthly plan' })
    expect(choose).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1)
  })

  it('browses with previous / next, the plan selectors and the arrow keys without choosing', async () => {
    const { user, location } = await openPricing()
    await user.click(screen.getByRole('button', { name: 'Next plan' }))
    expect(frontPlan()).toBe('pro-annual')
    await user.click(screen.getByRole('button', { name: 'Next plan' }))
    expect(frontPlan()).toBe('free') // wraps around
    await user.click(screen.getByRole('button', { name: 'Previous plan' }))
    expect(frontPlan()).toBe('pro-annual')
    const chip = screen.getByRole('button', { name: 'Show Professional Starter' })
    await user.click(chip)
    expect(frontPlan()).toBe('pro-starter')
    expect(chip).toHaveAttribute('aria-current', 'true')
    expect(screen.getByText(/Professional Starter · 3 of 5/)).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(frontPlan()).toBe('celebration')
    await user.keyboard('{End}')
    expect(frontPlan()).toBe('pro-annual')
    expect(location()).toBe('/pricing') // browsing doesn't select
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
  })

  it('can be used with the keyboard alone', async () => {
    const { user, location } = await openPricing()
    peek('Professional Starter').focus()
    await user.keyboard('{Enter}')
    expect(frontPlan()).toBe('pro-starter')
    expect(location()).toBe('/pricing?plan=pro-starter')
    screen.getByRole('button', { name: 'Show Professional Annual' }).focus()
    await user.keyboard(' ')
    const choose = within(card('Professional Annual')).getByRole('button', { name: 'Choose Professional Annual plan' })
    choose.focus()
    await user.keyboard('{Enter}')
    expect(choose).toHaveAttribute('aria-pressed', 'true')
    expect(location()).toBe('/pricing?plan=pro-annual')
  })

  it('opens on the plan in ?plan=, selected and in front', async () => {
    await openPricing('/pricing?plan=celebration')
    expect(frontPlan()).toBe('celebration')
    expect(within(card('Celebration')).getByRole('button', { name: /Choose Celebration/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('ignores an unknown ?plan=', async () => {
    await openPricing('/pricing?plan=enterprise')
    expect(frontPlan()).toBe('pro-monthly')
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
  })

  it('keeps the Free Editor workflow: "Start free" opens the template gallery', async () => {
    const { user, location } = await openPricing()
    await user.click(peek('Free Editor'))
    await user.click(within(card('Free Editor')).getByRole('link', { name: 'Start free' }))
    await waitFor(() => expect(location()).toBe('/templates'))
  })

  it('lets you ask for a Special Request quote: a link to the quote form, nothing sent', async () => {
    const { api, user } = await openPricing()
    await user.click(screen.getByRole('button', { name: 'Request a quote' }))
    expect(screen.getByRole('button', { name: 'Request a quote' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/we’ll reply with a quote/)).toBeInTheDocument()
    expect(within(screen.getByRole('status')).getByRole('link', { name: 'Request a quote' })).toHaveAttribute('href', '/request-quote?plan=special-request')
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

describe('editor publish dialog follows the server’s payment mode', () => {
  const LIVE = { available: true, test: false, message: 'Pay by bank transfer to DMC LIMITED.' }
  const editable = (page) => Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, structuredClone(page[k])]))

  /** Ana, signed in, with a cloud draft of garden-vows in her account. */
  function anaWithCloudDraft() {
    const api = createFakeAuthApi()
    const ana = api.addUser({ email: 'ana@example.com', displayName: 'Ana', emailVerified: true })
    api.signIn(ana)
    const page = createPageFromTemplate(getTemplateBySlug('garden-vows'))
    const draft = api.seedPage(ana, page.id, editable(page))
    return { api, draft }
  }

  async function openPublishDialog(path, api) {
    const { user } = renderApp(path, { api })
    await user.click(await screen.findByRole('button', { name: 'Publish' }, { timeout: 6000 }))
    const dialog = await screen.findByRole('dialog', { name: 'Publish your page' })
    await within(dialog).findByText('₦2,500')
    return dialog
  }

  it('live payments + a saved draft: continues to the publishing page', async () => {
    const { api, draft } = anaWithCloudDraft()
    api.state.checkout = LIVE
    const dialog = await openPublishDialog(`/editor/garden-vows?page=${draft.id}`, api)
    const next = await within(dialog).findByRole('link', { name: 'Continue to publishing' })
    expect(next).toHaveAttribute('href', `/publish/${draft.id}`)
    expect(within(dialog).queryByRole('button', { name: 'Continue to payment' })).not.toBeInTheDocument()
    expect(within(dialog).getByText(/pay by bank transfer\. Your page goes live once we confirm the payment/)).toBeInTheDocument()
    // No bank details here: no account number (any 10 digits), no bank-detail wording.
    expect(dialog.textContent).not.toMatch(/coming soon|\d{10}|account number/i)
  })

  it('regression: payments switched on after the app loaded are picked up without a reload', async () => {
    const { api, draft } = anaWithCloudDraft()
    // The app first loads the price list while payments are still off (e.g. the pricing page)…
    const first = renderApp('/pricing', { api })
    expect(await screen.findByText(/Paid publishing is coming soon\. You can compare plans now/)).toBeInTheDocument()
    first.unmount()
    // …then the server is restarted with PAYMENTS_MODE=live, and the customer opens the dialog.
    api.state.checkout = LIVE
    const dialog = await openPublishDialog(`/editor/garden-vows?page=${draft.id}`, api)
    expect(await within(dialog).findByRole('link', { name: 'Continue to publishing' })).toHaveAttribute('href', `/publish/${draft.id}`)
    expect(within(dialog).queryByText(/coming soon/)).not.toBeInTheDocument()
  })

  it('and the other way: payments switched off are shown as unavailable again', async () => {
    const { api, draft } = anaWithCloudDraft()
    api.state.checkout = LIVE
    const first = await openPublishDialog(`/editor/garden-vows?page=${draft.id}`, api)
    expect(within(first).getByRole('link', { name: 'Continue to publishing' })).toBeInTheDocument()
    cleanup()
    api.state.checkout = null // back to the fixture: available false
    const dialog = await openPublishDialog(`/editor/garden-vows?page=${draft.id}`, api)
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Continue to payment' })).toBeDisabled())
    expect(within(dialog).getByText(/Paid publishing is coming soon/)).toBeInTheDocument()
  })

  it('live payments but signed out: disabled, and says to log in and save first (not “coming soon”)', async () => {
    const api = createFakeAuthApi()
    api.state.checkout = LIVE
    const dialog = await openPublishDialog('/editor/garden-vows', api)
    expect(within(dialog).getByRole('button', { name: 'Continue to payment' })).toBeDisabled()
    expect(within(dialog).getByText(/Log in or create a free account, save this page to your account/)).toBeInTheDocument()
    expect(within(dialog).queryByText(/coming soon/)).not.toBeInTheDocument()
  })

  it('live payments, signed in, page only on this device: asks to save it to the account first', async () => {
    const api = createFakeAuthApi()
    api.signIn(api.addUser({ email: 'ana@example.com', displayName: 'Ana', emailVerified: true }))
    api.state.checkout = LIVE
    const dialog = await openPublishDialog('/editor/garden-vows', api)
    expect(within(dialog).getByRole('button', { name: 'Continue to payment' })).toBeDisabled()
    expect(within(dialog).getByText('Save this page to your account first, then publish it from here.')).toBeInTheDocument()
  })

  it('the pricing page reuses a recent price list; the dialog and publishing page always ask again', async () => {
    const { api, draft } = anaWithCloudDraft()
    const pricing = renderApp('/pricing', { api })
    await screen.findByRole('list', { name: 'Publishing plans' })
    pricing.unmount()
    renderApp('/pricing', { api }).unmount()
    await waitFor(() => expect(api.requestsTo('/plans')).toHaveLength(1)) // reused within a minute
    await openPublishDialog(`/editor/garden-vows?page=${draft.id}`, api)
    await waitFor(() => expect(api.requestsTo('/plans')).toHaveLength(2)) // asked afresh
  })
})

describe('pricing notice follows the server’s payment mode', () => {
  it('says how to publish when payments are on, and “coming soon” only when they are off', async () => {
    const api = createFakeAuthApi()
    api.state.checkout = { available: true, test: false, message: 'Pay by bank transfer to DMC LIMITED.' }
    const { user } = await openPricing('/pricing', api)
    expect(screen.queryByText(/Paid publishing is coming soon/)).not.toBeInTheDocument()
    await user.click(peek('Celebration')) // brings it to the front and selects it
    expect(await screen.findByText(/save it to your account, then choose Publish/)).toBeInTheDocument()
    expect(screen.queryByText(/coming soon/)).not.toBeInTheDocument()
  })
})

describe('prices for my country (display only; payment stays in NGN)', () => {
  const withRate = () => {
    const api = createFakeAuthApi()
    // Test values, not real rates. No GHS: Ghana has no rate here, so it shows NGN.
    api.state.estimate = { ngnPerUsd: 1500, rates: { USD: 1, NGN: 1500, ILS: 3.7, GBP: 0.8, JPY: 150 }, asOf: '2026-11-15' }
    return api
  }
  const clearChoice = () => window.localStorage.removeItem('mylinnnk.priceCountry')
  const price = (name) => within(card(name)).getByText((_, el) => el?.classList?.contains('plan-card__amount')).textContent

  it('no country chosen and a rate configured: US-dollar estimates, each with the exact NGN amount payable', async () => {
    clearChoice()
    await openPricing('/pricing', withRate())
    expect(price('Celebration')).toBe('≈ US$1.67')
    expect(within(card('Celebration')).getByText(/Estimate · you pay/)).toHaveTextContent('Estimate · you pay ₦2,500 (NGN)')
    expect(price('Professional Annual')).toBe('≈ US$16')
    expect(price('Free Editor')).toBe('US$0')
    // Only a small control above the cards: no explanatory paragraphs.
    expect(screen.getByRole('button', { name: 'Change country' })).toHaveTextContent('Change country')
    expect(screen.queryByText(/Estimates use/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Prices are shown as/)).not.toBeInTheDocument()
    // The rate provider is credited, discreetly, while its estimates are shown.
    const credit = screen.getByRole('link', { name: 'Rates By Exchange Rate API' })
    expect(credit).toHaveAttribute('href', 'https://www.exchangerate-api.com')
    expect(credit).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('no provider credit for Nigeria (NGN prices)', async () => {
    window.localStorage.setItem('mylinnnk.priceCountry', 'NG')
    await openPricing('/pricing', withRate())
    expect(price('Celebration')).toBe('₦2,500')
    expect(screen.queryByRole('link', { name: 'Rates By Exchange Rate API' })).not.toBeInTheDocument()
    clearChoice()
  })

  it('no provider credit for a manually set rate', async () => {
    clearChoice()
    const manual = createFakeAuthApi()
    manual.state.estimate = { ngnPerUsd: 1500, asOf: '2026-11-15', source: 'manual' }
    await openPricing('/pricing', manual)
    expect(price('Celebration')).toBe('≈ US$1.67')
    expect(screen.queryByRole('link', { name: 'Rates By Exchange Rate API' })).not.toBeInTheDocument()
  })

  it('no rate configured: no US-dollar amount is invented; the NGN price is shown', async () => {
    clearChoice()
    await openPricing()
    expect(price('Celebration')).toBe('₦2,500')
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/aren’t available right now/)).not.toBeInTheDocument()
  })

  it('choosing Nigeria shows naira; a country without a rate falls back to naira; the choice is remembered on this device', async () => {
    clearChoice()
    const { user } = await openPricing('/pricing', withRate())
    await user.click(screen.getByRole('button', { name: 'Change country' }))
    await user.selectOptions(screen.getByLabelText('Your country'), 'NG')
    await user.click(screen.getByRole('button', { name: 'Show prices' }))
    expect(price('Celebration')).toBe('₦2,500')
    expect(within(card('Celebration')).queryByText(/Estimate/)).not.toBeInTheDocument()
    expect(window.localStorage.getItem('mylinnnk.priceCountry')).toBe('NG')
    expect(screen.getByRole('button', { name: 'Prices for Nigeria. Change country' })).toHaveTextContent('NigeriaChange country')
    await user.click(screen.getByRole('button', { name: 'Prices for Nigeria. Change country' }))
    expect(screen.getByLabelText('Your country')).toHaveValue('NG') // the current choice is preselected
    await user.selectOptions(screen.getByLabelText('Your country'), 'GH')
    await user.click(screen.getByRole('button', { name: 'Show prices' }))
    expect(screen.getByRole('button', { name: 'Prices for Ghana. Change country' })).toBeInTheDocument()
    await waitFor(() => expect(price('Celebration')).toBe('₦2,500')) // no GHS rate: NGN, quietly
    expect(within(card('Celebration')).queryByText(/Estimate/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Rates By Exchange Rate API' })).not.toBeInTheDocument()
    // Cancel keeps the current choice.
    await user.click(screen.getByRole('button', { name: 'Prices for Ghana. Change country' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(window.localStorage.getItem('mylinnnk.priceCountry')).toBe('GH')
    clearChoice()
  })

  it('each country sees its own currency, converted from the NGN price, with the NGN amount payable beneath', async () => {
    const choose = async (user, code) => {
      await user.click(screen.getByRole('button', { name: /Change country/ }))
      await user.selectOptions(screen.getByLabelText('Your country'), code)
      await user.click(screen.getByRole('button', { name: 'Show prices' }))
    }
    clearChoice()
    const { user } = await openPricing('/pricing', withRate())
    for (const [code, celebration, annual] of [
      ['IL', '≈ ₪6.17', '≈ ₪59.20'],
      ['GB', '≈ £1.33', '≈ £12.80'],
      ['US', '≈ US$1.67', '≈ US$16'],
      ['JP', '≈ JP¥250', '≈ JP¥2,400'], // en-NG formatting names the yen (not the yuan)
    ]) {
      await choose(user, code)
      await waitFor(() => expect(price('Celebration')).toBe(celebration))
      expect(price('Professional Annual')).toBe(annual)
      expect(within(card('Celebration')).getByText(/Estimate · you pay/)).toHaveTextContent('Estimate · you pay ₦2,500 (NGN)')
      expect(screen.getByRole('link', { name: 'Rates By Exchange Rate API' })).toBeInTheDocument()
    }
    clearChoice()
  })

  it('eurozone countries show EUR', async () => {
    window.localStorage.setItem('mylinnnk.priceCountry', 'DE')
    const api = withRate()
    api.state.estimate.rates.EUR = 0.92
    await openPricing('/pricing', api)
    await waitFor(() => expect(price('Celebration')).toBe('≈ €1.53'))
    expect(within(card('Celebration')).getByText(/Estimate · you pay/)).toHaveTextContent('Estimate · you pay ₦2,500 (NGN)')
    clearChoice()
  })

  it('a country reported by the edge preselects its currency (labelled not verified) when nothing was chosen', async () => {
    clearChoice()
    const api = withRate()
    api.state.visitorCountry = 'IL'
    await openPricing('/pricing', api)
    await waitFor(() => expect(price('Celebration')).toBe('≈ ₪6.17'))
    expect(screen.getByRole('button', { name: 'Prices for Israel (from your connection; not verified). Change country' })).toBeInTheDocument()
    expect(window.localStorage.getItem('mylinnnk.priceCountry')).toBeNull() // detection is never saved as a choice
  })

  it('an explicit choice always wins over detection, and switching updates every estimate at once', async () => {
    window.localStorage.setItem('mylinnnk.priceCountry', 'GB')
    const api = withRate()
    api.state.visitorCountry = 'IL'
    const { user } = await openPricing('/pricing', api)
    await waitFor(() => expect(price('Celebration')).toBe('≈ £1.33'))
    expect(screen.getByRole('button', { name: 'Prices for United Kingdom. Change country' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Change country/ }))
    await user.selectOptions(screen.getByLabelText('Your country'), 'JP')
    await user.click(screen.getByRole('button', { name: 'Show prices' }))
    await waitFor(() => expect(price('Celebration')).toBe('≈ JP¥250'))
    expect(price('Professional Starter')).toBe('≈ JP¥750')
    expect(price('Professional Monthly')).toBe('≈ JP¥300')
    expect(price('Professional Annual')).toBe('≈ JP¥2,400')
    clearChoice()
  })

  it('unknown country (no choice, nothing detected): US-dollar estimates', async () => {
    clearChoice()
    await openPricing('/pricing', withRate())
    await waitFor(() => expect(price('Celebration')).toBe('≈ US$1.67'))
    expect(screen.getByRole('button', { name: 'Change country' })).toBeInTheDocument()
  })

  it('regression: choosing Israel requests display=ILS and all five cards switch (IL → NG → GB → US → JP, no reload)', async () => {
    clearChoice()
    const api = withRate()
    const { user } = await openPricing('/pricing', api)
    const choose = async (code) => {
      await user.click(screen.getByRole('button', { name: /Change country/ }))
      await user.selectOptions(screen.getByLabelText('Your country'), code)
      await user.click(screen.getByRole('button', { name: 'Show prices' }))
    }
    const cards = ['Free Editor', 'Celebration', 'Professional Starter', 'Professional Monthly', 'Professional Annual']
    for (const [code, display, expected] of [
      ['IL', 'ILS', ['₪0', '≈ ₪6.17', '≈ ₪18.50', '≈ ₪7.40', '≈ ₪59.20']],
      ['NG', 'NGN', ['₦0', '₦2,500', '₦7,500', '₦3,000', '₦24,000']],
      ['GB', 'GBP', ['£0', '≈ £1.33', '≈ £4', '≈ £1.60', '≈ £12.80']],
      ['US', 'USD', ['US$0', '≈ US$1.67', '≈ US$5', '≈ US$2', '≈ US$16']],
      ['JP', 'JPY', ['JP¥0', '≈ JP¥250', '≈ JP¥750', '≈ JP¥300', '≈ JP¥2,400']],
    ]) {
      await choose(code)
      await waitFor(() => expect(cards.map(price)).toEqual(expected))
      if (code !== 'NG') {
        expect(api.state.requests.some((r) => r.path === '/plans' && new URL(r.url, 'http://localhost').searchParams.get('display') === display)).toBe(true)
        for (const name of cards.slice(1)) expect(within(card(name)).getByText(/Estimate · you pay/)).toHaveTextContent(/you pay ₦[0-9,]+ \(NGN\)/)
      }
    }
    clearChoice()
  })
})
