/**
 * The public information pages: Contact, Request a Quote, Privacy policy, Terms of service and
 * Cookie settings (routes, forms, validation, sending, failures, consent).
 */
import 'fake-indexeddb/auto'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'
import { CONSENT_CATEGORIES, CONSENT_KEY, STORAGE_ITEMS, hasConsent, readConsent, saveConsent } from '../utils/consent.js'
import CookieSettingsPage from './CookieSettingsPage/CookieSettingsPage.jsx'

vi.setConfig({ testTimeout: 20000 })

/** Forms reject submissions made faster than a person could type; tests move the clock on. */
afterEach(() => vi.useRealTimers())

const main = () => screen.getByRole('main')
const fill = async (user, label, text) => user.type(within(main()).getByLabelText(label), text)

describe('Contact us (/contact)', () => {
  it('shows the support address and sends a message to the API', async () => {
    const api = createFakeAuthApi()
    const { user } = renderApp('/contact', { api })
    expect(await screen.findByRole('heading', { level: 1, name: /We’re here to help\./ })).toBeInTheDocument()
    expect(within(main()).getAllByRole('link', { name: 'support@dmclimited.net' })[0]).toHaveAttribute('href', 'mailto:support@dmclimited.net')
    expect(within(main()).getAllByRole('link', { name: 'Request a quote' })[0]).toHaveAttribute('href', '/request-quote')

    await fill(user, 'Your name', 'Ada Obi')
    await fill(user, 'Email', 'ada@example.com')
    await user.selectOptions(within(main()).getByLabelText('Topic'), 'payments')
    await fill(user, 'Subject', 'My transfer')
    await fill(user, 'Message', 'I paid yesterday with reference MLK-ABCD-EFGH. Any news?')
    await user.click(within(main()).getByRole('button', { name: 'Send message' }))

    expect(await screen.findByText('Thanks! Your message has been sent.')).toBeInTheDocument()
    expect(screen.getByText('ENQ-TEST01')).toBeInTheDocument()
    const [sent] = api.state.enquiries
    expect(sent).toMatchObject({ type: 'contact', name: 'Ada Obi', email: 'ada@example.com', category: 'payments', subject: 'My transfer', website: '' })
    expect(sent.message).toMatch(/MLK-ABCD-EFGH/)
    expect(typeof sent.startedAt).toBe('number')
  })

  it('checks the fields before sending, and focuses the first problem', async () => {
    const api = createFakeAuthApi()
    const { user } = renderApp('/contact', { api })
    await user.click(await within(await screen.findByRole('main')).findByRole('button', { name: 'Send message' }))
    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText(/Enter your email address/)).toBeInTheDocument()
    expect(screen.getByText('Choose a topic.')).toBeInTheDocument()
    expect(screen.getByText('Add a short subject.')).toBeInTheDocument()
    expect(within(main()).getByLabelText('Your name')).toHaveFocus()
    expect(api.state.enquiries).toHaveLength(0)
  })

  it('explains a delivery failure and keeps what was written', async () => {
    const api = createFakeAuthApi()
    api.state.enquiryFailure = true
    const { user } = renderApp('/contact', { api })
    await screen.findByRole('heading', { level: 1, name: /We’re here to help/ })
    await fill(user, 'Your name', 'Ada Obi')
    await fill(user, 'Email', 'ada@example.com')
    await user.selectOptions(within(main()).getByLabelText('Topic'), 'general')
    await fill(user, 'Subject', 'Hello')
    await fill(user, 'Message', 'Just saying hello to the team.')
    await user.click(within(main()).getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText(/We couldn’t send your message just now/)).toBeInTheDocument()
    expect(within(main()).getByLabelText('Message')).toHaveValue('Just saying hello to the team.')
  })

  it('hides the spam trap from people and assistive technology', async () => {
    renderApp('/contact')
    await screen.findByRole('heading', { level: 1, name: /We’re here to help/ })
    const trap = document.querySelector('input[name="website"]')
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(trap).toHaveAttribute('tabindex', '-1')
  })
})

describe('Request a quote (/request-quote)', () => {
  it('keeps the plan, page and country it was opened with, and sends them along', async () => {
    const api = createFakeAuthApi()
    const { user } = renderApp('/request-quote?plan=special-request&page=mylinnnk.com%2Fp%2Fmoses&country=gb', { api })
    expect(await screen.findByRole('heading', { level: 1, name: /Tell us about your moment\./ })).toBeInTheDocument()
    const chips = within(main()).getByRole('list', { name: 'What this request is about' })
    expect(within(chips).getByText('Plan: special request')).toBeInTheDocument()
    expect(within(chips).getByText('Page: mylinnnk.com/p/moses')).toBeInTheDocument()
    expect(within(main()).getByLabelText('Country')).toHaveValue('GB')
    expect(within(main()).getByLabelText('Service you need')).toHaveValue('custom-design')

    await fill(user, 'Full name', 'Moses Okon')
    await fill(user, 'Email', 'moses@example.com')
    await user.selectOptions(within(main()).getByLabelText('What is the page for?'), 'wedding')
    await fill(user, 'Describe your project', 'A wedding page with our story, photos and the schedule for the day.')
    await user.selectOptions(within(main()).getByLabelText('Timeline (optional)'), '1-month')
    await user.click(within(main()).getByRole('button', { name: 'Send request' }))

    expect(await screen.findByText('Thank you! Your request is on its way.')).toBeInTheDocument()
    expect(api.state.enquiries[0]).toMatchObject({
      type: 'quote',
      name: 'Moses Okon',
      email: 'moses@example.com',
      phone: '',
      country: 'GB',
      occasion: 'wedding',
      service: 'custom-design',
      budget: '',
      timeline: '1-month',
      context: { plan: 'special-request', page: 'mylinnnk.com/p/moses' },
    })
  })

  it('ignores context it can’t trust, and validates the form', async () => {
    const api = createFakeAuthApi()
    const { user } = renderApp('/request-quote?plan=<script>&page=javascript:alert(1)%20x&country=ZZ', { api })
    await screen.findByRole('heading', { level: 1, name: /Tell us about your moment/ })
    expect(within(main()).queryByRole('list', { name: 'What this request is about' })).not.toBeInTheDocument()
    expect(within(main()).getByLabelText('Country')).toHaveValue('')
    await fill(user, 'Phone (optional)', 'call me')
    await user.click(within(main()).getByRole('button', { name: 'Send request' }))
    for (const text of ['Enter your full name.', 'Choose your country.', 'Choose what the page is for.', 'Choose the service you need.', /Tell us a little more/, /phone number/]) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
    expect(api.state.enquiries).toHaveLength(0)
  })

  it('is where the payment dialog’s and the pricing page’s “Request a quote” lead', async () => {
    const { user, location } = renderApp('/pricing')
    await screen.findByRole('list', { name: 'Publishing plans' })
    await user.click(screen.getByRole('button', { name: 'Request a quote' }))
    await user.click(within(screen.getByRole('status')).getByRole('link', { name: 'Request a quote' }))
    await waitFor(() => expect(location()).toBe('/request-quote?plan=special-request'))
    expect(await screen.findByRole('heading', { level: 1, name: /Tell us about your moment/ })).toBeInTheDocument()
  })
})

describe('Privacy policy and Terms of service', () => {
  for (const [path, heading, sections] of [
    ['/privacy-policy', /Your pages, your information\./, ['Information we collect', 'Cookies and storage on your device', 'How long we keep it', 'Your choices and rights']],
    ['/terms-of-service', /Clear terms for your pages\./, ['Publishing and plans', 'Payments and verification', 'Renewals and expiry', 'Cancellations and refunds', 'Questions and disputes']],
  ]) {
    it(`${path}: sections with a table of contents`, async () => {
      renderApp(path)
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
      const toc = screen.getByRole('navigation', { name: 'On this page' })
      for (const title of sections) {
        const link = within(toc).getByRole('link', { name: title })
        const target = document.getElementById(link.getAttribute('href').slice(1))
        expect(within(target).getByRole('heading', { level: 2, name: title })).toBeInTheDocument()
      }
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
    })
  }

  it('says no advertising, analytics or tracking, and states the plan durations accurately', async () => {
    renderApp('/privacy-policy')
    expect(await screen.findByText(/We don’t sell your information, show advertising or use analytics/)).toBeInTheDocument()
    renderApp('/terms-of-service')
    for (const text of [/Celebration: live for 30 days/, /Professional Starter: live for 90 days/, /Professional Monthly: live for 30 days per payment/, /Professional Annual: live for 365 days per payment/]) {
      expect(await screen.findByText(text)).toBeInTheDocument()
    }
  })

  for (const path of ['/privacy-policy', '/terms-of-service']) {
    it(`${path}: operator notice, numbered sections and a closing contact block`, async () => {
      renderApp(path)
      const notice = await screen.findByRole('complementary', { name: 'Who operates MyLinnnk' })
      expect(notice).toHaveTextContent('MyLinnnk is a service of DMC LIMITED (company registration number RC 8631322).')
      const toc = screen.getByRole('navigation', { name: 'On this page' })
      const links = within(toc).getAllByRole('link')
      expect(links[0]).toHaveTextContent(/^1\./)
      expect(links.at(-1)).toHaveTextContent(new RegExp(`^${links.length}\\. Contact us$`))
      // Numbers are visual only: accessible names stay the plain titles.
      const contact = within(toc).getByRole('link', { name: 'Contact us' })
      const section = document.getElementById(contact.getAttribute('href').slice(1))
      expect(within(section).getByRole('heading', { level: 2, name: 'Contact us' })).toBeInTheDocument()
      expect(section.querySelector('address')).toHaveTextContent('DMC LIMITED (operator of MyLinnnk)Company registration number: RC 8631322')
    })
  }

  it('describes stored enquiries and link previews as they work, and promises no reminder emails (not enabled)', async () => {
    renderApp('/privacy-policy')
    expect(await screen.findByText(/stored securely in MyLinnnk with a reference number/)).toBeInTheDocument()
    expect(screen.queryByText(/not stored in the MyLinnnk database/)).not.toBeInTheDocument()
    expect(screen.getByText(/show a preview using the page’s title/)).toBeInTheDocument()
    expect(screen.getByText(/outside the country where you live/)).toBeInTheDocument()
    expect(screen.queryByText(/7 days and 1 day before/)).not.toBeInTheDocument()
    renderApp('/terms-of-service')
    expect(await screen.findByText(/any reminder we send is a courtesy, not a guarantee/)).toBeInTheDocument()
    expect(screen.queryByText(/We’ll email you a reminder/)).not.toBeInTheDocument()
  })

  it('no unfinished “To be confirmed” notices on either legal page, in any build', async () => {
    for (const path of ['/privacy-policy', '/terms-of-service']) {
      renderApp(path)
      await screen.findByRole('navigation', { name: 'On this page' })
      expect(screen.queryByText(/To be confirmed/)).not.toBeInTheDocument()
      expect(screen.queryByRole('note')).not.toBeInTheDocument()
      cleanup()
    }
  })
})

describe('Cookie settings (/cookie-settings)', () => {
  it('lists everything stored, with no switches when nothing is optional', async () => {
    renderApp('/cookie-settings')
    expect(await screen.findByRole('heading', { level: 1, name: /Only what’s needed\./ })).toBeInTheDocument()
    expect(screen.getByText('There’s nothing to switch off.')).toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.getByText('Always on')).toBeInTheDocument()
    const table = screen.getByRole('table')
    for (const item of STORAGE_ITEMS) expect(within(table).getByText(item.name)).toBeInTheDocument()
  })

  it('the list matches the storage the code actually uses', () => {
    const names = STORAGE_ITEMS.map((i) => i.name).join(' ')
    for (const key of ['mylinnnk_session', '__Host-mylinnnk_session', 'mylinnnk.drafts.index.v1', 'mylinnnk.draft.v1.', 'mylinnnk.recovery.v1.', 'mylinnnk.imports.v1.', 'mylinnnk.importPostponed.v1.', 'mylinnnk-media']) {
      expect(names).toContain(key)
    }
    expect(CONSENT_CATEGORIES.every((c) => c.required)).toBe(true) // no optional cookies exist today
  })

  it('optional categories (if ever added) are off until chosen, and the choice is remembered', async () => {
    const categories = [...CONSENT_CATEGORIES, { id: 'insights', required: false, title: 'Insights', description: 'Anonymous usage counts.' }]
    expect(hasConsent('insights', categories)).toBe(false)
    expect(hasConsent('necessary', categories)).toBe(true)
    expect(hasConsent('unknown', categories)).toBe(false)

    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CookieSettingsPage categories={categories} />
      </MemoryRouter>,
    )
    const toggle = screen.getByRole('switch')
    expect(toggle).not.toBeChecked()
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Save my choices' }))
    expect(screen.getByText('Your choices are saved for this browser.')).toBeInTheDocument()
    expect(hasConsent('insights', categories)).toBe(true)
    expect(readConsent(categories).choices).toEqual({ insights: true })
    expect(JSON.parse(localStorage.getItem(CONSENT_KEY)).choices).toEqual({ insights: true })
    saveConsent({ insights: false }, categories)
    expect(hasConsent('insights', categories)).toBe(false)
  })
})

describe('footer', () => {
  it('links to every new page', async () => {
    const { user, location } = renderApp('/templates')
    const footer = screen.getByRole('contentinfo')
    for (const [name, path] of [
      ['Contact us', '/contact'],
      ['Request a quote', '/request-quote'],
      ['Privacy policy', '/privacy-policy'],
      ['Terms of service', '/terms-of-service'],
      ['Cookie settings', '/cookie-settings'],
    ]) {
      expect(within(footer).getByRole('link', { name })).toHaveAttribute('href', path)
    }
    await user.click(within(footer).getByRole('link', { name: 'Privacy policy' }))
    await waitFor(() => expect(location()).toBe('/privacy-policy'))
  })
})

describe('Request a quote stays exactly as approved (regression)', () => {
  it('keeps its two-column layout, three steps, form card and confirmation card', async () => {
    const api = createFakeAuthApi()
    const { user } = renderApp('/request-quote', { api })
    await screen.findByRole('heading', { level: 1, name: /Tell us about your moment\./ })
    const body = document.querySelector('.info-body')
    expect(body).not.toBeNull()
    expect(body.querySelector('.info-intro .info-intro__title')).toHaveTextContent('You don’t need a finished brief.')
    expect([...body.querySelectorAll('.info-steps > li strong')].map((s) => s.textContent)).toEqual(['Share the idea', 'Get a clear quote', 'Approve and relax'])
    const card = body.querySelector('.info-card')
    expect(card.querySelector('form[aria-label="Request a quote"]')).not.toBeNull()
    for (const label of ['Full name', 'Email', 'Phone (optional)', 'Country', 'What is the page for?', 'Service you need', 'Describe your project', 'Budget (optional)', 'Timeline (optional)']) {
      expect(within(card).getByLabelText(label)).toBeInTheDocument()
    }
    await fill(user, 'Full name', 'Moses Okon')
    await fill(user, 'Email', 'moses@example.com')
    await user.selectOptions(within(main()).getByLabelText('Country'), 'NG')
    await user.selectOptions(within(main()).getByLabelText('What is the page for?'), 'wedding')
    await user.selectOptions(within(main()).getByLabelText('Service you need'), 'custom-design')
    await fill(user, 'Describe your project', 'A wedding page with our story, photos and the schedule.')
    await user.click(within(main()).getByRole('button', { name: 'Send request' }))
    expect(await screen.findByText('Thank you! Your request is on its way.')).toBeInTheDocument()
    expect(document.querySelector('.info-card .info-sent')).not.toBeNull() // the confirmation replaces the form inside the same card
    expect(within(document.querySelector('.info-sent')).getByRole('heading', { name: 'Thank you! Your request is on its way.' })).toBeInTheDocument()
    expect(within(document.querySelector('.info-sent')).getByText(/^ENQ-/)).toBeInTheDocument()
    expect(within(document.querySelector('.info-sent')).getByRole('link', { name: 'Browse templates' })).toHaveAttribute('href', '/templates')
  })
})
