import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import AuthLayout from '../../components/AuthLayout/AuthLayout.jsx'
import { ActionButton, FormAlert, PasswordField, SubmitButton, TextField } from '../../components/Form/Form.jsx'
import Button from '../../components/Button/Button.jsx'
import { errorMessage, NOTICES } from '../../auth/messages.js'
import { afterLoginPath, authHref } from '../../auth/redirects.js'
import { useAuth } from '../../auth/useAuth.js'
import { useAuthForm } from '../../auth/useAuthForm.js'
import { fieldErrorsFromApi, validateEmail, validateLoginPassword } from '../../auth/validation.js'

const INITIAL = { email: '', password: '' }
const validate = (v) => ({ email: () => validateEmail(v.email), password: () => validateLoginPassword(v.password) })

/**
 * /login[?next=/path]
 * After logging in: see afterLoginPath (auth/redirects.js). Ordinary users: the safe `next` path or
 * their account, as before. The admin: an intentional safe `next` (e.g. the admin page that asked for a
 * fresh sign-in) or else the dashboard. Whether
 * someone is the admin is the server's answer to this login (isAdmin), never a guess made here.
 */
export default function LoginPage() {
  const { status, user, isAdmin, notice, login, logout, clearNotice } = useAuth()
  const [params] = useSearchParams()
  const afterLogin = (admin) => afterLoginPath(params.get('next'), { isAdmin: admin })
  const next = afterLogin(isAdmin)
  const navigate = useNavigate()
  const { formRef, values, setField, errors, showFieldErrors, formError, setFormError, submitting, handleSubmit } = useAuthForm(INITIAL, validate)
  const [switching, setSwitching] = useState(false)

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      const result = await login({ email: email.trim(), password })
      navigate(afterLogin(result?.isAdmin === true), { replace: true })
    } catch (error) {
      if (error.code === 'VALIDATION_FAILED') showFieldErrors(fieldErrorsFromApi(error, { email: 'Enter a valid email address.', password: 'Enter your password.' }))
      setFormError(errorMessage(error))
    }
  })

  const switchAccount = async () => {
    setSwitching(true)
    try {
      await logout()
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setSwitching(false)
    }
  }

  // Already signed in (and not in the middle of this form's own login).
  if (status === 'authenticated' && !submitting) {
    return (
      <AuthLayout title="You’re logged in" lead={`Signed in as ${user.displayName} (${user.email}).`}>
        <FormAlert>{formError}</FormAlert>
        <div className="auth-actions">
          <Button to={next}>Continue</Button>
          <ActionButton busy={switching} busyLabel="Logging out…" onClick={switchAccount}>
            Log in as someone else
          </ActionButton>
        </div>
      </AuthLayout>
    )
  }

  const banner = notice ? NOTICES[notice] : null

  return (
    <AuthLayout
      title="Welcome back"
      pageTitle="Log in"
      lead="Log in to manage your MyLinnnk account."
      footer={
        <p>
          Don’t have an account? <Link to={authHref('signup', params.get('next'))}>Sign up</Link>
        </p>
      }
    >
      {banner && (
        <FormAlert tone={banner.tone}>
          {banner.text}{' '}
          <button type="button" className="link-button" onClick={clearNotice}>
            Dismiss
          </button>
        </FormAlert>
      )}
      {status === 'unavailable' && (
        <FormAlert tone="warn">We can’t reach MyLinnnk right now, so logging in may not work. You can still browse templates and edit as a guest.</FormAlert>
      )}
      <FormAlert>{formError}</FormAlert>
      <form ref={formRef} className="form" onSubmit={onSubmit} noValidate aria-label="Log in">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={setField}
          error={errors.email}
          maxLength={254}
        />
        <PasswordField name="password" value={values.password} onChange={setField} error={errors.password} maxLength={256} />
        <Link className="auth-inline-link" to="/forgot-password">
          Forgot password?
        </Link>
        <SubmitButton busy={submitting} busyLabel="Logging in…">
          Log in
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}
