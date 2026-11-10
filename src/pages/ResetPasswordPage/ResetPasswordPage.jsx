import { useState } from 'react'
import { Link } from 'react-router'
import AuthLayout from '../../components/AuthLayout/AuthLayout.jsx'
import Button from '../../components/Button/Button.jsx'
import { FormAlert, PasswordField, SubmitButton } from '../../components/Form/Form.jsx'
import { errorMessage } from '../../auth/messages.js'
import { isWellFormedToken, useOneTimeToken } from '../../auth/useOneTimeToken.js'
import { useAuth } from '../../auth/useAuth.js'
import { useAuthForm } from '../../auth/useAuthForm.js'
import { PASSWORD_MAX, PASSWORD_MIN, validateConfirmation, validateNewPassword } from '../../auth/validation.js'

const INITIAL = { password: '', confirmation: '' }
const validate = (v) => ({
  password: () => validateNewPassword(v.password),
  confirmation: () => validateConfirmation(v.password, v.confirmation),
})

function InvalidLink({ reason }) {
  return (
    <AuthLayout title="This link can’t be used" pageTitle="Reset password" footer={<Link to="/login">Back to log in</Link>}>
      <FormAlert tone="warn" title={reason}>
        <p>Password reset links work once and expire after a short time. Request a new one and use the most recent email.</p>
      </FormAlert>
      <div className="auth-actions">
        <Button to="/forgot-password">Request a new link</Button>
      </div>
    </AuthLayout>
  )
}

/** /reset-password?token=… (link from the password reset email) */
export default function ResetPasswordPage() {
  const token = useOneTimeToken()
  const { resetPassword } = useAuth()
  const { formRef, values, setField, errors, showFieldErrors, formError, setFormError, submitting, handleSubmit } = useAuthForm(INITIAL, validate)
  const [result, setResult] = useState(null) // 'done' | 'invalid'

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      await resetPassword({ token, password })
      setResult('done')
    } catch (error) {
      const tokenRejected = error.code === 'INVALID_TOKEN' || (error.code === 'VALIDATION_FAILED' && error.details?.some((d) => d.path === 'token'))
      if (tokenRejected) return setResult('invalid')
      if (error.code === 'VALIDATION_FAILED') showFieldErrors({ password: `Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.` })
      setFormError(errorMessage(error))
    }
  })

  if (!isWellFormedToken(token)) return <InvalidLink reason="This password reset link is incomplete or broken." />
  if (result === 'invalid') return <InvalidLink reason="This password reset link is invalid or has expired." />

  if (result === 'done') {
    return (
      <AuthLayout title="Password changed" pageTitle="Reset password">
        <FormAlert tone="success" title="Your new password is set.">
          <p>For your security you’ve been signed out on every device. Log in again with your new password.</p>
        </FormAlert>
        <div className="auth-actions">
          <Button to="/login">Log in</Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Choose a new password" pageTitle="Reset password" lead="After you save it, you’ll be signed out everywhere and can log in with the new password.">
      <FormAlert>{formError}</FormAlert>
      <form ref={formRef} className="form" onSubmit={onSubmit} noValidate aria-label="Choose a new password">
        <PasswordField
          name="password"
          label="New password"
          autoComplete="new-password"
          value={values.password}
          onChange={setField}
          error={errors.password}
          hint={`At least ${PASSWORD_MIN} characters.`}
          maxLength={PASSWORD_MAX}
        />
        <PasswordField
          name="confirmation"
          label="Confirm new password"
          autoComplete="new-password"
          value={values.confirmation}
          onChange={setField}
          error={errors.confirmation}
          maxLength={PASSWORD_MAX}
        />
        <SubmitButton busy={submitting} busyLabel="Saving…">
          Save new password
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}
