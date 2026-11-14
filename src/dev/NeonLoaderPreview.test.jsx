import 'fake-indexeddb/auto'
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AuthProvider from '../auth/AuthProvider.jsx'
import AppRoutes from '../components/App/AppRoutes.jsx'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import NeonLoaderPreview from './NeonLoaderPreview.jsx'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

const advance = (milliseconds) => act(() => vi.advanceTimersByTime(milliseconds))
const message = 'Preparing your MyLinnnk experience...'

async function openRoute(path) {
  const api = createFakeAuthApi()
  vi.stubGlobal('fetch', vi.fn(api.fetch))
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><AppRoutes /></AuthProvider>
    </MemoryRouter>,
  )
  await act(async () => { await vi.dynamicImportSettled() })
}

describe('development neon loader preview', () => {
  it('completes after exactly ten seconds without holding tests in real time', () => {
    render(<NeonLoaderPreview />)
    expect(screen.getByRole('status')).toHaveTextContent(message)
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true')
    advance(9999)
    expect(screen.getByRole('status')).toHaveTextContent(message)
    advance(1)
    expect(screen.getByRole('heading', { name: 'Preview complete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replay' })).toBeEnabled()
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false')
    expect(screen.queryByText(message)).not.toBeInTheDocument()
  })

  it('replays a fresh ten-second preview', () => {
    render(<NeonLoaderPreview />)
    advance(10000)
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }))
    expect(screen.getByRole('status')).toHaveTextContent(message)
    advance(9999)
    expect(screen.queryByRole('button', { name: 'Replay' })).not.toBeInTheDocument()
    advance(1)
    expect(screen.getByRole('button', { name: 'Replay' })).toBeInTheDocument()
  })

  it('cleans up the preview timer on unmount, including in StrictMode', () => {
    const { unmount } = render(<StrictMode><NeonLoaderPreview /></StrictMode>)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('makes the route available in development', async () => {
    vi.stubEnv('DEV', true)
    await openRoute('/dev/neon-loader')
    expect(screen.getByRole('status')).toHaveTextContent(message)
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('uses the normal not-found route in production', async () => {
    vi.stubEnv('DEV', false)
    await openRoute('/dev/neon-loader')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.queryByText(message)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /neon.*preview/i })).not.toBeInTheDocument()
  })

  it('preserves regular application routes through the development boundary', async () => {
    vi.stubEnv('DEV', true)
    await openRoute('/templates')
    expect(screen.getAllByRole('link', { name: /^Use This Template:/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Create Your Page Free' })).toHaveAttribute('href', '/templates')
  })
})
