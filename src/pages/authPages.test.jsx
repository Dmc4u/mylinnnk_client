import { cleanup, configure, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

// Full-app journeys (router, auth, editor). Alone they take up to ~2 s, but in the default parallel
// run (many jsdom workers) they can take 3–4× longer, so this file gets more time per test and per
// findBy/waitFor than the defaults (5 s / 1 s). Assertions are unchanged.
vi.setConfig({ testTimeout: 15000 })
configure({ asyncUtilTimeout: 4000 })

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

  it('creates the account, signs in and asks for the emailed code, then goes to the account', async () => {
    const { user, location, api } = renderApp('/signup')
    await user.type(await screen.findByLabelText('Your name'), '  Bea Costa ')
    await user.type(screen.getByLabelText('Email'), 'bea@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(location()).toBe('/verify-email'))
    expect(screen.getByText('Welcome to MyLinnnk, Bea Costa!')).toBeInTheDocument()
    expect(screen.getByText(/Enter the 6-digit code we sent to bea@example.com/)).toBeInTheDocument()
    expect(api.requestsTo('/auth/register')[0].body).toEqual({ displayName: 'Bea Costa', email: 'bea@example.com', password: PASSWORD })

    const input = await screen.findByLabelText('6-digit code')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(input).toHaveAttribute('autocomplete', 'one-time-code')
    await user.type(input, api.lastEmail('email_verification_code').code)
    await user.click(screen.getByRole('button', { name: 'Confirm email' }))
    expect(await screen.findByText('Thanks, your email address is confirmed.')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Go to your account' }))
    await waitFor(() => expect(location()).toBe('/account'))
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  it('keeps where the visitor was going: the code page continues (or skips) to it', async () => {
    const { user, location } = renderApp('/signup?next=%2Ftemplates')
    await user.type(await screen.findByLabelText('Your name'), 'Bea')
    await user.type(screen.getByLabelText('Email'), 'bea@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(location()).toBe('/verify-email?next=%2Ftemplates'))
    expect(await screen.findByRole('link', { name: 'Skip for now' })).toHaveAttribute('href', '/templates')
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

  it('offers a code instead (sent with the CSRF token) when a signed-in user’s old link has expired', async () => {
    const { api, ana } = apiWithAna()
    api.signIn(ana)
    const token = api.issueToken(ana, 'email_verification')
    api.state.tokens.get(token).expired = true
    const { user } = renderApp(`/verify-email?token=${token}`, { api })
    expect(await screen.findByText('This verification link is invalid or has expired.')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Send a new code' }))
    expect(await screen.findByText(/We’ve sent a new code to ana@example.com/)).toBeInTheDocument()
    expect(api.requestsTo('/auth/resend-verification')[0].headers['X-CSRF-Token']).toBe(api.state.session.csrfToken)
    await user.type(screen.getByLabelText('6-digit code'), api.lastEmail('email_verification_code').code)
    await user.click(screen.getByRole('button', { name: 'Confirm email' }))
    expect(await screen.findByText('Your email address is already confirmed.')).toBeInTheDocument()
  })

  it('asks signed-out visitors with an expired link to log in for a new one', async () => {
    const { api, ana } = apiWithAna()
    const token = api.issueToken(ana, 'email_verification')
    api.state.tokens.get(token).used = true
    renderApp(`/verify-email?token=${token}`, { api })
    expect(await screen.findByText('This verification link is invalid or has expired.')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login?next=%2Faccount')
    expect(screen.getByText(/to get a verification code/)).toBeInTheDocument()
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

describe('email verification code', () => {
  const signedInAnaWithCode = () => {
    const { api, ana } = apiWithAna()
    api.signIn(ana)
    const code = api.issueCode(ana)
    return { api, ana, code }
  }
  const wrong = (code) => (code === '111111' ? '222222' : '111111')

  it('accepts a pasted code with spaces or dashes, and never shows it in the address bar', async () => {
    const { api, code } = signedInAnaWithCode()
    const { user, location } = renderApp('/verify-email', { api })
    const input = await screen.findByLabelText('6-digit code')
    await user.click(input)
    await user.paste(`${code.slice(0, 3)} - ${code.slice(3)}`)
    expect(input).toHaveValue(code)
    await user.click(screen.getByRole('button', { name: 'Confirm email' }))
    expect(await screen.findByText('Thanks, your email address is confirmed.')).toBeInTheDocument()
    expect(api.requestsTo('/auth/verify-email-code')[0].body).toEqual({ code })
    expect(location()).toBe('/verify-email')
  })

  it('explains a wrong code with the attempts left, without sending incomplete codes', async () => {
    const { api, code } = signedInAnaWithCode()
    const { user } = renderApp('/verify-email', { api })
    const input = await screen.findByLabelText('6-digit code')
    expect(await screen.findByText(/It expires in (10:00|9:5\d)/)).toBeInTheDocument()
    await user.type(input, '123')
    await user.click(screen.getByRole('button', { name: 'Confirm email' }))
    expect(screen.getByText('Enter the 6-digit code from the email.')).toBeInTheDocument()
    expect(api.requestsTo('/auth/verify-email-code')).toHaveLength(0)

    await user.clear(input)
    await user.type(input, wrong(code))
    await user.click(screen.getByRole('button', { name: 'Confirm email' }))
    expect(await screen.findByText('That code isn’t right. 4 attempts left.')).toBeInTheDocument()
    expect(screen.getByText(/4 attempts left\.$/, { selector: '.field__hint' })).toBeInTheDocument()
  })

  it('after 5 wrong codes asks for a new one, and the resend button waits for the cooldown', async () => {
    const { api, ana, code } = signedInAnaWithCode()
    api.state.codes.get(ana.id).attempts = 4
    const { user } = renderApp('/verify-email', { api })
    const input = await screen.findByLabelText('6-digit code')
    await user.type(input, wrong(code))
    await user.click(screen.getByRole('button', { name: 'Confirm email' }))
    expect(await screen.findByText('Too many incorrect attempts. Send a new code to try again.')).toBeInTheDocument()
    const resend = screen.getByRole('button', { name: /^Send a new code in / })
    expect(resend).toBeDisabled()
    expect(api.requestsTo('/auth/resend-verification')).toHaveLength(0)
  })

  it('an expired code asks for a new one, which then works', async () => {
    const { api, ana, code } = signedInAnaWithCode()
    api.ageCode(ana, 11 * 60_000)
    const { user } = renderApp('/verify-email', { api })
    expect(await screen.findByText(/You need a new code/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('6-digit code'), code)
    await user.click(screen.getByRole('button', { name: 'Confirm email' }))
    expect(await screen.findByText('This code has expired. Send a new code to try again.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send a new code' }))
    expect(await screen.findByText(/We’ve sent a new code to ana@example.com/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Send a new code in / })).toBeDisabled()
    await user.type(screen.getByLabelText('6-digit code'), api.lastEmail('email_verification_code').code)
    await user.click(screen.getByRole('button', { name: 'Confirm email' }))
    expect(await screen.findByText('Thanks, your email address is confirmed.')).toBeInTheDocument()
  })

  it('shows the server’s wait time when a new code is asked for too soon', async () => {
    const { api, ana } = signedInAnaWithCode()
    api.ageCode(ana, 61_000) // the page loads with the cooldown over…
    const { user } = renderApp('/verify-email', { api })
    const resend = await screen.findByRole('button', { name: 'Send a new code' })
    api.state.codes.get(ana.id).lastSentAt = Date.now() - 15_000 // …but another tab just asked for a code
    await user.click(resend)
    expect(await screen.findByText('Please wait 45 seconds before asking for another code.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Send a new code in (45|44) s$/ })).toBeDisabled()
  })

  it('asks signed-out visitors to log in, and tells verified users they’re done', async () => {
    const { api, ana } = apiWithAna({ emailVerified: true })
    renderApp('/verify-email', { api })
    expect(await screen.findByText(/to enter the code from your verification email/)).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login?next=%2Faccount')

    api.signIn(ana)
    cleanup()
    renderApp('/verify-email', { api })
    expect(await screen.findByText('Your email address is already confirmed.')).toBeInTheDocument()
  })

  it('can be entered on the account page too', async () => {
    const { api, code } = signedInAnaWithCode()
    const { user } = renderApp('/account', { api })
    expect(await screen.findByText('Not confirmed yet')).toBeInTheDocument()
    await user.type(screen.getByLabelText('6-digit code'), code)
    await user.click(screen.getByRole('button', { name: 'Confirm email' }))
    expect(await screen.findByText('Confirmed')).toBeInTheDocument()
    expect(screen.queryByLabelText('6-digit code')).not.toBeInTheDocument()
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
    const resend = await screen.findByRole('button', { name: 'Send a new code' })
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
