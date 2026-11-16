/**
 * /templates gallery filters: category names only (no counts on the chips, no visible total), the
 * selected category is highlighted and shows exactly its templates, search still narrows the results,
 * and screen readers still hear what is shown.
 */
import 'fake-indexeddb/auto'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CATEGORIES, TEMPLATES } from '../data/templates.js'
import { renderApp } from '../test/renderApp.jsx'

vi.setConfig({ testTimeout: 20000 })

const gridNames = () =>
  within(document.querySelector('.gallery__grid'))
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent)
    .sort()

describe('template gallery filters', () => {
  it('chips show only the category names, with no numbers; no visible template count', async () => {
    renderApp('/templates')
    const filters = await screen.findByRole('group', { name: 'Filter by category' })
    const chips = within(filters).getAllByRole('button')
    expect(chips.map((b) => b.textContent.trim())).toEqual(['All', ...CATEGORIES.map((c) => c.label)])
    for (const chip of chips) expect(chip.textContent).not.toMatch(/\d/)
    expect(document.querySelector('.gallery__chip-count')).toBeNull()
    expect(screen.queryByText(/^\d+ templates?\b/)).not.toBeInTheDocument()
    expect(within(filters).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('a category shows all of its templates, highlighted; All brings everything back', async () => {
    const { user, location } = renderApp('/templates')
    const filters = await screen.findByRole('group', { name: 'Filter by category' })
    await user.click(within(filters).getByRole('button', { name: 'Birthdays' }))
    await waitFor(() => expect(location()).toBe('/templates?category=birthdays'))
    expect(within(filters).getByRole('button', { name: 'Birthdays' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(filters).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
    expect(gridNames()).toEqual(TEMPLATES.filter((t) => t.category === 'birthdays').map((t) => t.name).sort())
    expect(gridNames()).toContain('Golden Jubilee')
    expect(screen.getByRole('status')).toHaveTextContent('Showing Birthdays templates')
    await user.click(within(filters).getByRole('button', { name: 'All' }))
    await waitFor(() => expect(gridNames()).toHaveLength(TEMPLATES.length))
  })

  it('search still works together with a category, by keyboard too', async () => {
    const { user } = renderApp('/templates?category=birthdays')
    const search = await screen.findByRole('searchbox', { name: 'Search templates' })
    await user.type(search, 'chapters')
    await waitFor(() => expect(gridNames()).toEqual(['Golden Jubilee']))
    expect(screen.getByRole('status')).toHaveTextContent('Showing Birthdays templates matching “chapters”')
    await user.clear(search)
    await user.type(search, 'zzzz-nothing')
    expect(await screen.findByText('No templates found', { selector: '.gallery__empty-title' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    await waitFor(() => expect(gridNames()).toHaveLength(TEMPLATES.length))
    // Chips are real buttons: reachable with Tab, activated with Enter.
    const filters = screen.getByRole('group', { name: 'Filter by category' })
    within(filters).getByRole('button', { name: 'Weddings' }).focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(within(filters).getByRole('button', { name: 'Weddings' })).toHaveAttribute('aria-pressed', 'true'))
  })
})
