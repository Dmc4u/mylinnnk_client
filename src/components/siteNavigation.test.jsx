/**
 * Site navigation: the header lists real pages only (Templates, Pricing, auth,
 * Create); homepage sections are linked from the footer, from any route.
 * The homepage closing section (CTA) and footer share one background.
 */
import 'fake-indexeddb/auto'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

vi.setConfig({ testTimeout: 15000 })

const mainNav = () => screen.getByRole('navigation', { name: 'Main' })
const footer = () => screen.getByRole('contentinfo')
const linkNames = (el) => within(el).getAllByRole('link').map((a) => a.textContent.trim())

describe('header navigation', () => {
  it('shows only Templates, Pricing, Log in and Create Your Page Free (signed out)', async () => {
    renderApp('/')
    await within(mainNav()).findByRole('link', { name: 'Log in' })
    expect(linkNames(mainNav())).toEqual(['Templates', 'Pricing', 'Log in', 'Create Your Page Free'])
    for (const removed of ['Features', 'Moments', 'How it works']) {
      expect(within(mainNav()).queryByRole('link', { name: removed })).not.toBeInTheDocument()
    }
    expect(within(mainNav()).getByRole('link', { name: 'Templates' })).toHaveAttribute('href', '/templates')
    expect(within(mainNav()).getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing')
    expect(within(mainNav()).getByRole('link', { name: 'Create Your Page Free' })).toHaveAttribute('href', '/templates')
  })

  it('keeps the account menu for signed-in users', async () => {
    const api = createFakeAuthApi()
    api.signIn(api.addUser({ email: 'ana@example.com', displayName: 'Ana', emailVerified: true }))
    renderApp('/', { api })
    const account = await within(mainNav()).findByRole('button', { name: /Ana/ })
    expect(account).toBeInTheDocument()
    expect(within(mainNav()).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
    expect(within(mainNav()).getAllByRole('link').map((a) => a.textContent.trim())).toEqual(['Templates', 'Pricing', 'Create Your Page Free'])
  })

  it('uses the same list for the mobile menu (one list, toggled)', async () => {
    const { user } = renderApp('/pricing')
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-controls', 'site-nav-list')
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    const list = document.getElementById('site-nav-list')
    await within(list).findByRole('link', { name: 'Log in' })
    expect(linkNames(list)).toEqual(['Templates', 'Pricing', 'Log in', 'Create Your Page Free'])
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('footer navigation', () => {
  it('keeps every link, homepage sections included, in two groups', () => {
    renderApp('/templates')
    const nav = within(footer()).getByRole('navigation', { name: 'Footer' })
    expect(within(nav).getByRole('list', { name: 'Create' })).toBeInTheDocument()
    expect(within(nav).getByRole('list', { name: 'Discover' })).toBeInTheDocument()
    const hrefs = Object.fromEntries(within(nav).getAllByRole('link').map((a) => [a.textContent.trim(), a.getAttribute('href')]))
    expect(hrefs).toEqual({
      Templates: '/templates',
      Pricing: '/pricing',
      'Get started': '/#get-started',
      Features: '/#features',
      Moments: '/#moments',
      'How it works': '/#how',
    })
    expect(within(footer()).getByText(/© \d{4} MyLinnnk\. All rights reserved\./)).toBeInTheDocument()
  })

  it('opens homepage sections from another route', async () => {
    const { user, location } = renderApp('/pricing')
    const moments = within(footer()).getByRole('link', { name: 'Moments' })
    expect(moments).toHaveAttribute('href', '/#moments')
    await user.click(moments)
    // The probe shows path + search (the hash scroll itself is checked in a real browser).
    await waitFor(() => expect(location()).toBe('/'))
    expect(document.getElementById('moments')).toBeInTheDocument()
  })

  it('continues the closing section only on the homepage', () => {
    renderApp('/')
    expect(footer()).toHaveClass('site-footer--continuous')
  })

  it('stands on its own on other pages', () => {
    renderApp('/pricing')
    expect(footer()).not.toHaveClass('site-footer--continuous')
  })
})

describe('homepage closing section', () => {
  it('keeps its text, brand mark and Create Your Page Free → /templates', async () => {
    const { user, location } = renderApp('/')
    const section = screen.getByRole('region', { name: 'Ready to tell your story?' })
    expect(within(section).getByText('Your moments deserve a page of their own.')).toBeInTheDocument()
    expect(section.querySelector('svg, img')).not.toBeNull()
    const cta = within(section).getByRole('link', { name: 'Create Your Page Free' })
    expect(cta).toHaveAttribute('href', '/templates')
    // Decorations are hidden from assistive technology and never take focus or clicks.
    expect(section.querySelector('.get-started__orbits')).toHaveAttribute('aria-hidden', 'true')
    await user.click(cta)
    await waitFor(() => expect(location()).toBe('/templates'))
  })
})
