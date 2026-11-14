import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PublicPage from '../../pages/PublicPage/PublicPage.jsx'
import { loadPublishedPage, preparePublishedPage } from '../../pages/PublicPage/publicPage.js'
import { getTemplateBySlug } from '../../data/templates.js'
import { createPageFromTemplate } from '../../editor/model/page.js'
import DraftListSkeleton from './DraftListSkeleton.jsx'

vi.mock('../../pages/PublicPage/publicPage.js', async (importOriginal) => ({
  ...await importOriginal(),
  loadPublishedPage: vi.fn(),
}))

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function openPendingPage() {
  let resolve
  loadPublishedPage.mockReturnValue(new Promise((complete) => { resolve = complete }))
  render(<MemoryRouter initialEntries={['/p/example']}><Routes><Route path="p/:slug" element={<PublicPage />} /></Routes></MemoryRouter>)
  return resolve
}

describe('published-page loading integration', () => {
  it('starts retrieval immediately and renders a 100ms result without showing the loader', async () => {
    const complete = openPendingPage()
    expect(loadPublishedPage).toHaveBeenCalledWith('example')
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(100))
    const draft = createPageFromTemplate(getTemplateBySlug('garden-vows'))
    await act(async () => complete({ status: 'ready', page: preparePublishedPage({ ...draft, title: 'Ready at 100ms', slug: 'example' }) }))
    expect(screen.getByRole('main', { name: 'Ready at 100ms' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows a slow-operation loader and immediately replaces it with retry feedback on failure', async () => {
    const complete = openPendingPage()
    act(() => vi.advanceTimersByTime(200))
    expect(screen.getByRole('status')).toHaveTextContent('Loading page…')
    await act(async () => complete({ status: 'error' }))
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load this page')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(0)
  })
})

it('uses noninteractive draft-list placeholders with one accessible loading message', () => {
  const { container } = render(<DraftListSkeleton />)
  expect(screen.getAllByRole('status')).toHaveLength(1)
  expect(screen.getByRole('status')).toHaveTextContent('Loading your drafts…')
  expect(container.querySelector('ul')).toHaveAttribute('aria-hidden', 'true')
  expect(container.querySelectorAll('li')).toHaveLength(3)
  expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
})
