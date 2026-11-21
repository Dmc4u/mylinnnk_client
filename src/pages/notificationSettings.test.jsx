/**
 * Account settings: "Email me when I sign in" (Stage 3). Off by default, saved with the session's CSRF token,
 * the switch reflects the server's answer, failures are announced and leave the saved value, and the page says
 * that security alerts are always sent.
 */
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

function signedIn() {
  const api = createFakeAuthApi()
  const user = api.addUser({ email: 'ada@example.com', displayName: 'Ada', emailVerified: true })
  api.signIn(user)
  return { api, user }
}

describe('notification settings', () => {
  it('turns sign-in emails on and off (CSRF), with a calm confirmation', async () => {
    const { api } = signedIn()
    const { user } = renderApp('/dashboard/account', { api })
    const toggle = await screen.findByRole('switch', { name: 'Email me when I sign in' })
    expect(toggle).not.toBeChecked()
    expect(screen.getByText(/Security alerts are always sent/)).toBeInTheDocument()

    await user.click(toggle)
    await waitFor(() => expect(toggle).toBeChecked())
    expect(await screen.findByText('Sign-in emails are on.')).toBeInTheDocument()
    const saved = api.state.requests.find((r) => r.method === 'PATCH' && r.path === '/auth/preferences')
    expect(saved.body).toEqual({ loginAlerts: true })
    expect(saved.headers['X-CSRF-Token']).toBe(api.state.session.csrfToken)

    await user.click(toggle)
    await waitFor(() => expect(toggle).not.toBeChecked())
    expect(await screen.findByText('Sign-in emails are off.')).toBeInTheDocument()
  })

  it('a failed save is announced and the switch keeps the saved value', async () => {
    const { api } = signedIn()
    api.state.preferencesFailure = true
    const { user } = renderApp('/dashboard/account', { api })
    const toggle = await screen.findByRole('switch', { name: 'Email me when I sign in' })
    await user.click(toggle)
    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/)
    expect(toggle).not.toBeChecked()
  })

  it('shows the saved value when the page opens', async () => {
    const { api, user: account } = signedIn()
    account.loginAlerts = true
    renderApp('/dashboard/account', { api })
    expect(await screen.findByRole('switch', { name: 'Email me when I sign in' })).toBeChecked()
  })
})
