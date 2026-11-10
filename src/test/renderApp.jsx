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
  const user = userEvent.setup()
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
