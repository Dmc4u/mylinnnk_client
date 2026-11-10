import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

const PASSWORD = 'correct horse battery'

function apiWithAna(options = {}) {
  const api = createFakeAuthApi()
  const ana = api.addUser({ email: 'ana@example.com', displayName: 'Ana Silva', ...options })
  return { api, ana }
}

const header = () => screen.getByRole('banner')

describe('log in', () => {
  it('validates fields before calling the API and focuses the first problem', async () => {
    const { api, user } = renderApp('/login')
    await user.click(await screen.findByRole('button', { name: 'Log in' }))
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveFocus()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(api.requestsTo('/auth/login')).toHaveLength(0)
  })

  it('shows one message for a wrong password', async () => {
    const { api } = apiWithAna()
    const { user } = renderApp('/login', { api })
    await user.type(await screen.findByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), 'not my password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(screen.getByLabelText('Password')).toHaveValue('not my password')
  })

  it('explains rate limiting and API outages', async () => {
    const { api } = apiWithAna()
    api.state.rateLimited = true
    const { user } = renderApp('/login', { api })
    await user.type(await screen.findByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts')

    api.state.rateLimited = false
    api.state.down = true
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t reach MyLinnnk'))
  })

  it('logs in, returns to the requested page and shows the account menu', async () => {
    const { api } = apiWithAna()
    const { user, location } = renderApp('/login?next=%2Ftemplates', { api })
    await user.type(await screen.findByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(location()).toBe('/templates'))
    expect(within(header()).getByRole('button', { name: /Account menu for Ana Silva/ })).toBeInTheDocument()
    expect(within(header()).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
  })

  it('ignores unsafe redirect targets', async () => {
    const { api } = apiWithAna()
    const { user, location } = renderApp('/login?next=https%3A%2F%2Fevil.example', { api })
    await user.type(await screen.findByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(location()).toBe('/account'))
  })

  it('lets the password be shown and hidden', async () => {
    const { user } = renderApp('/login')
    const input = await screen.findByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
  })
})

describe('sign up', () => {
  it('validates name, email and password length', async () => {
    const { api, user } = renderApp('/signup')
    await user.type(await screen.findByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText(/Enter a valid email address/)).toBeInTheDocument()
    expect(screen.getByText('Use at least 10 characters.')).toBeInTheDocument()
    expect(screen.getByLabelText('Your name')).toHaveFocus()
    expect(api.requestsTo('/auth/register')).toHaveLength(0)
  })

  it('explains a taken email with links to log in or reset the password', async () => {
    const { api } = apiWithAna()
    const { user } = renderApp('/signup', { api })
    await user.type(await screen.findByLabelText('Your name'), 'Someone')
    await user.type(screen.getByLabelText('Email'), 'ANA@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('We couldn’t create an account with this email.')
    expect(within(alert).getByRole('link', { name: 'reset your password' })).toHaveAttribute('href', '/forgot-password')
  })

  it('creates the account, signs in and welcomes the user on the account page', async () => {
    const { user, location, api } = renderApp('/signup')
    await user.type(await screen.findByLabelText('Your name'), '  Bea Costa ')
    await user.type(screen.getByLabelText('Email'), 'bea@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(location()).toBe('/account'))
    expect(screen.getByText('Welcome to MyLinnnk, Bea Costa!')).toBeInTheDocument()
    expect(screen.getByText(/We’ve sent a link to bea@example.com/)).toBeInTheDocument()
    expect(screen.getByText('Not confirmed yet')).toBeInTheDocument()
    expect(api.requestsTo('/auth/register')[0].body).toEqual({ displayName: 'Bea Costa', email: 'bea@example.com', password: PASSWORD })
  })
})

describe('password recovery', () => {
  it('forgot password always shows the same confirmation', async () => {
    const { api } = apiWithAna()
    const { user } = renderApp('/forgot-password', { api })
    await user.type(await screen.findByLabelText('Email'), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText('If an account exists for that email, we’ve sent a link to reset the password.')).toBeInTheDocument()
    expect(api.requestsTo('/auth/forgot-password')[0].body).toEqual({ email: 'nobody@example.com' })
  })

  it('resets the password from the emailed link, hides the token and signs out', async () => {
    const { api, ana } = apiWithAna()
    api.signIn(ana)
    const token = api.issueToken(ana, 'password_reset')
    const { user, location } = renderApp(`/reset-password?token=${token}`, { api })
    await waitFor(() => expect(location()).toBe('/reset-password'))
    expect(document.body.textContent).not.toContain(token)

    await user.type(screen.getByLabelText('New password'), 'a brand new password')
    await user.type(screen.getByLabelText('Confirm new password'), 'a different one!!')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(screen.getByText('The passwords don’t match.')).toBeInTheDocument()
    expect(api.requestsTo('/auth/reset-password')).toHaveLength(0)

    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('Confirm new password'), 'a brand new password')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByText('Your new password is set.')).toBeInTheDocument()
    expect(api.requestsTo('/auth/reset-password')[0].body).toEqual({ token, password: 'a brand new password' })
    expect(within(header()).getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(ana.password).toBe('a brand new password')
  })

  it('explains expired or reused reset links', async () => {
    const { api, ana } = apiWithAna()
    const token = api.issueToken(ana, 'password_reset')
    api.state.tokens.get(token).used = true
    const { user } = renderApp(`/reset-password?token=${token}`, { api })
    await user.type(await screen.findByLabelText('New password'), 'a brand new password')
    await user.type(screen.getByLabelText('Confirm new password'), 'a brand new password')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByText('This password reset link is invalid or has expired.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/forgot-password')
  })

  it('rejects broken links without calling the API', async () => {
    const { api } = renderApp('/reset-password?token=abc')
    expect(await screen.findByText('This password reset link is incomplete or broken.')).toBeInTheDocument()
    expect(api.requestsTo('/auth/reset-password')).toHaveLength(0)
  })
})

describe('email verification', () => {
  it('confirms the email once, automatically, and removes the token from the address bar', async () => {
    const { api, ana } = apiWithAna()
    api.signIn(ana)
    const token = api.issueToken(ana, 'email_verification')
    const { location } = renderApp(`/verify-email?token=${token}`, { api })
    expect(await screen.findByText('Thanks, your email address is confirmed.')).toBeInTheDocument()
    expect(location()).toBe('/verify-email')
    expect(api.requestsTo('/auth/verify-email')).toHaveLength(1) // StrictMode doesn't send it twice
    expect(screen.getByRole('link', { name: 'Go to your account' })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(token)
  })

  it('offers a new link (sent with the CSRF token) when a signed-in user’s link has expired', async () => {
    const { api, ana } = apiWithAna()
    api.signIn(ana)
    const token = api.issueToken(ana, 'email_verification')
    api.state.tokens.get(token).expired = true
    const { user } = renderApp(`/verify-email?token=${token}`, { api })
    expect(await screen.findByText('This verification link is invalid or has expired.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send a new verification email' }))
    expect(await screen.findByText(/We’ve sent a new link to ana@example.com/)).toBeInTheDocument()
    expect(api.requestsTo('/auth/resend-verification')[0].headers['X-CSRF-Token']).toBe(api.state.session.csrfToken)
  })

  it('asks signed-out visitors with an expired link to log in for a new one', async () => {
    const { api, ana } = apiWithAna()
    const token = api.issueToken(ana, 'email_verification')
    api.state.tokens.get(token).used = true
    renderApp(`/verify-email?token=${token}`, { api })
    expect(await screen.findByText('This verification link is invalid or has expired.')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login?next=%2Faccount')
    expect(screen.getByText(/to get a new verification link/)).toBeInTheDocument()
  })

  it('lets the visitor retry when the API can’t be reached', async () => {
    const { api, ana } = apiWithAna()
    const token = api.issueToken(ana, 'email_verification')
    api.state.down = true
    const { user } = renderApp(`/verify-email?token=${token}`, { api })
    expect(await screen.findByText('We couldn’t confirm your email')).toBeInTheDocument()
    api.state.down = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Thanks, your email address is confirmed.')).toBeInTheDocument()
  })
})

describe('account page and header', () => {
  it('sends signed-out visitors to log in first', async () => {
    const { location } = renderApp('/account')
    await waitFor(() => expect(location()).toBe('/login?next=%2Faccount'))
  })

  it('shows the signed-in user and logs out to the home page', async () => {
    const { api, ana } = apiWithAna({ emailVerified: true })
    api.signIn(ana)
    const { user, location } = renderApp('/account', { api })
    expect(await screen.findByText('ana@example.com', { selector: '.account-profile__email' })).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(location()).toBe('/'))
    expect(within(header()).getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(within(header()).getByRole('link', { name: 'Create Your Page Free' })).toBeInTheDocument()
    expect(api.state.session).toBeNull()
  })

  it('logging out still works after the server-side session has already expired', async () => {
    const { api, ana } = apiWithAna()
    api.signIn(ana)
    const { user, location } = renderApp('/account', { api })
    await screen.findByText('ana@example.com', { selector: '.account-profile__email' })
    api.expireSession()
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(location()).toBe('/'))
    expect(within(header()).getByRole('link', { name: 'Log in' })).toBeInTheDocument()
  })

  it('redirects to log in with an explanation when a signed-in action finds the session expired', async () => {
    const { api, ana } = apiWithAna()
    api.signIn(ana)
    const { user, location } = renderApp('/account', { api })
    const resend = await screen.findByRole('button', { name: 'Send a new verification email' })
    api.state.session = { userId: 'revoked', csrfToken: 'x' }
    await user.click(resend)
    await waitFor(() => expect(location()).toBe('/login?next=%2Faccount'))
    expect(screen.getByText('Your session has expired. Please log in again.')).toBeInTheDocument()
  })

  it('shows a retry when the API is unavailable', async () => {
    const api = createFakeAuthApi()
    api.state.down = true
    const { user } = renderApp('/account', { api })
    expect(await screen.findByText('We can’t reach MyLinnnk right now.')).toBeInTheDocument()
    api.state.down = false
    api.signIn(api.addUser({ email: 'ana@example.com', displayName: 'Ana' }))
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('ana@example.com', { selector: '.account-profile__email' })).toBeInTheDocument()
  })

  it('the account menu opens, links to the account and logs out', async () => {
    const { api, ana } = apiWithAna()
    api.signIn(ana)
    const { user, location } = renderApp('/templates', { api })
    const toggle = await within(header()).findByRole('button', { name: /Account menu for Ana Silva/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()

    await user.click(toggle)
    await user.click(within(header()).getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(within(header()).getByRole('link', { name: 'Log in' })).toBeInTheDocument())
    expect(location()).toBe('/templates')
  })

  it('header login link remembers the current page', async () => {
    renderApp('/templates')
    expect(await within(header()).findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login?next=%2Ftemplates')
  })

  it('login page links to sign-up, keeping the return path', async () => {
    renderApp('/login?next=%2Ftemplates')
    const footer = (await screen.findByText(/Don’t have an account?/)).closest('p')
    expect(within(footer).getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup?next=%2Ftemplates')
  })

  it('every "Create Your Page Free" button goes straight to the template gallery', async () => {
    renderApp('/')
    const ctas = await screen.findAllByRole('link', { name: 'Create Your Page Free' })
    expect(ctas.length).toBe(3) // header, hero, "Ready to tell your story?"
    for (const cta of ctas) expect(cta).toHaveAttribute('href', '/templates')
    expect(screen.getByRole('heading', { name: 'Ready to tell your story?' })).toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/#get-started')
  })

  it('header shows at most two actions: Log in or the account menu, plus the primary CTA', async () => {
    const { api, ana } = apiWithAna()
    const signedOut = renderApp('/templates', { api })
    await within(header()).findByRole('link', { name: 'Log in' })
    expect(within(header()).queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument()
    expect(within(header()).getByRole('link', { name: 'Create Your Page Free' })).toHaveAttribute('href', '/templates')
    signedOut.unmount()

    api.signIn(ana)
    renderApp('/templates', { api })
    await within(header()).findByRole('button', { name: /Account menu for Ana Silva/ })
    expect(within(header()).getByRole('link', { name: 'Create Your Page Free' })).toHaveAttribute('href', '/templates')
    expect(within(header()).queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument()
  })
})
