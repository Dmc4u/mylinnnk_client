import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { vi } from 'vitest'
import AuthProvider from '../auth/AuthProvider.jsx'
import App from '../components/App/App.jsx'
import { createFakeAuthApi } from './fakeAuthApi.js'

function LocationProbe() {
  const { pathname, search } = useLocation()
  return (
    <output data-testid="location" hidden>
      {pathname + search}
    </output>
  )
}

/**
 * Renders the whole app (router + AuthProvider) at `path`, in StrictMode like
 * development, with `fetch` answered by a fake MyLinnnk API.
 */
export function renderApp(path = '/', { api = createFakeAuthApi() } = {}) {
  vi.stubGlobal('fetch', vi.fn(api.fetch))
  // delay: null — no artificial pause (a timer turn) between keystrokes and clicks. With the default,
  // typing a long text queues dozens of timer turns per test; under a full parallel run those starve
  // and slow tests drift past their time limits. The events themselves are unchanged.
  const user = userEvent.setup({ delay: null })
  const utils = render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
          <LocationProbe />
        </AuthProvider>
      </MemoryRouter>
    </StrictMode>,
  )
  return { api, user, ...utils, location: () => screen.getByTestId('location').textContent }
}
