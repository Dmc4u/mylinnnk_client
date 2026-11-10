import { useState } from 'react'
import { Link } from 'react-router'
import AuthLayout from '../../components/AuthLayout/AuthLayout.jsx'
import Button from '../../components/Button/Button.jsx'
import { FormAlert, SubmitButton, TextField } from '../../components/Form/Form.jsx'
import { errorMessage } from '../../auth/messages.js'
import { useAuth } from '../../auth/useAuth.js'
import { useAuthForm } from '../../auth/useAuthForm.js'
import { validateEmail } from '../../auth/validation.js'

const INITIAL = { email: '' }
const validate = (v) => ({ email: () => validateEmail(v.email) })

/**
 * /forgot-password
 * The API answers the same way whether or not an account exists, so this page
 * always shows the same confirmation.
 */
export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const { formRef, values, setField, errors, showFieldErrors, formError, setFormError, submitting, handleSubmit } = useAuthForm(INITIAL, validate)
  const [sentTo, setSentTo] = useState(null)

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await forgotPassword(email.trim())
      setSentTo(email.trim())
    } catch (error) {
      if (error.code === 'VALIDATION_FAILED') showFieldErrors({ email: 'Enter a valid email address.' })
      setFormError(errorMessage(error))
    }
  })

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" footer={<Link to="/login">Back to log in</Link>}>
        <FormAlert tone="success" title="If an account exists for that email, we’ve sent a link to reset the password.">
          <p>
            Look for an email from MyLinnnk sent to <b>{sentTo}</b>. The link works once and expires soon. If it doesn’t arrive in a few minutes,
            check your spam folder.
          </p>
        </FormAlert>
        <div className="auth-actions">
          <Button to="/login" variant="ghost">
            Back to log in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset your password"
      pageTitle="Forgot password"
      lead="Enter the email you signed up with and we’ll send you a link to choose a new password."
      footer={
        <p>
          Remembered it? <Link to="/login">Log in</Link>
        </p>
      }
    >
      <FormAlert>{formError}</FormAlert>
      <form ref={formRef} className="form" onSubmit={onSubmit} noValidate aria-label="Reset your password">
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
        <SubmitButton busy={submitting} busyLabel="Sending link…">
          Send reset link
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}
