import { Link, useNavigate, useSearchParams } from 'react-router'
import AuthLayout from '../../components/AuthLayout/AuthLayout.jsx'
import Button from '../../components/Button/Button.jsx'
import { FormAlert, PasswordField, SubmitButton, TextField } from '../../components/Form/Form.jsx'
import { errorMessage } from '../../auth/messages.js'
import { authHref, safeNextPath } from '../../auth/redirects.js'
import { useAuth } from '../../auth/useAuth.js'
import { useAuthForm } from '../../auth/useAuthForm.js'
import {
  DISPLAY_NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  fieldErrorsFromApi,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
} from '../../auth/validation.js'

const INITIAL = { displayName: '', email: '', password: '' }
const validate = (v) => ({
  displayName: () => validateDisplayName(v.displayName),
  email: () => validateEmail(v.email),
  password: () => validateNewPassword(v.password),
})

/** /signup[?next=/path] */
export default function SignupPage() {
  const { status, user, register } = useAuth()
  const [params] = useSearchParams()
  const next = params.get('next')
  const navigate = useNavigate()
  const { formRef, values, setField, errors, showFieldErrors, formError, setFormError, submitting, handleSubmit } = useAuthForm(INITIAL, validate)

  const onSubmit = handleSubmit(async ({ displayName, email, password }) => {
    try {
      const { verificationEmailSent } = await register({ displayName: displayName.trim(), email: email.trim(), password })
      // Enter the emailed code first (or skip); then on to where they were going.
      const after = safeNextPath(next, '')
      navigate(after ? `/verify-email?next=${encodeURIComponent(after)}` : '/verify-email', { replace: true, state: { welcome: true, verificationEmailSent } })
    } catch (error) {
      if (error.code === 'VALIDATION_FAILED') {
        showFieldErrors(
          fieldErrorsFromApi(error, {
            displayName: 'Enter your name.',
            email: 'Enter a valid email address.',
            password: `Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`,
          }),
        )
      }
      setFormError(
        error.code === 'EMAIL_UNAVAILABLE' ? (
          <>
            {error.message} <Link to={authHref('login', next)}>Log in</Link> or <Link to="/forgot-password">reset your password</Link>.
          </>
        ) : (
          errorMessage(error)
        ),
      )
    }
  })

  if (status === 'authenticated' && !submitting) {
    return (
      <AuthLayout title="You already have an account" lead={`You’re signed in as ${user.displayName} (${user.email}).`}>
        <div className="auth-actions">
          <Button to={safeNextPath(next)}>Continue</Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your free account"
      pageTitle="Sign up"
      lead="Keep your pages in one place. You can still create and edit pages as a guest without an account."
      footer={
        <p>
          Already have an account? <Link to={authHref('login', next)}>Log in</Link>
        </p>
      }
    >
      <FormAlert>{formError}</FormAlert>
      <form ref={formRef} className="form" onSubmit={onSubmit} noValidate aria-label="Sign up">
        <TextField
          label="Your name"
          name="displayName"
          autoComplete="name"
          value={values.displayName}
          onChange={setField}
          error={errors.displayName}
          maxLength={DISPLAY_NAME_MAX}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={setField}
          error={errors.email}
          hint="We’ll email you a 6-digit code to confirm it’s yours."
          maxLength={254}
        />
        <PasswordField
          name="password"
          autoComplete="new-password"
          value={values.password}
          onChange={setField}
          error={errors.password}
          hint={`At least ${PASSWORD_MIN} characters. A few unrelated words make a strong, memorable password.`}
          maxLength={PASSWORD_MAX}
        />
        <SubmitButton busy={submitting} busyLabel="Creating your account…">
          Create account
        </SubmitButton>
      </form>
      <p className="auth-note">Drafts you’ve made as a guest stay saved on this device when you sign up.</p>
    </AuthLayout>
  )
}
