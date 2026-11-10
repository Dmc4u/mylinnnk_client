/**
 * Client-side checks that mirror the API's rules
 * (mylinnnk_api/middleware/validators/authValidation.js). The API stays the
 * authority: these only give faster, friendlier feedback.
 */

export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 256
export const DISPLAY_NAME_MAX = 60
export const EMAIL_MAX = 254

// Deliberately simple: something@something.something, no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/

export function validateEmail(value) {
  const email = String(value ?? '').trim()
  if (!email) return 'Enter your email address.'
  if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) return 'Enter a valid email address, like name@example.com.'
  return null
}

export function validateNewPassword(value) {
  const password = String(value ?? '')
  if (!password) return 'Choose a password.'
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`
  return null
}

export function validateLoginPassword(value) {
  return String(value ?? '') ? null : 'Enter your password.'
}

export function validateDisplayName(value) {
  const name = String(value ?? '').trim()
  if (!name) return 'Enter your name.'
  if (name.length > DISPLAY_NAME_MAX) return `Use at most ${DISPLAY_NAME_MAX} characters.`
  if (CONTROL_CHARS.test(name)) return 'Use letters, numbers, spaces and punctuation only.'
  return null
}

export function validateConfirmation(password, confirmation) {
  if (!confirmation) return 'Enter the password again.'
  return password === confirmation ? null : 'The passwords don’t match.'
}

/** Runs `{ field: () => message|null }` checks and returns only the failures. */
export function collectErrors(checks) {
  const errors = {}
  for (const [field, check] of Object.entries(checks)) {
    const message = check()
    if (message) errors[field] = message
  }
  return errors
}

/**
 * Turns a VALIDATION_FAILED error's `details` into field messages. The API's
 * raw Joi messages are replaced by the client's wording where we have it.
 */
export function fieldErrorsFromApi(error, fallbackMessages = {}) {
  const errors = {}
  for (const detail of error?.details ?? []) {
    const field = String(detail?.path ?? '').split('.')[0]
    if (field && !errors[field]) errors[field] = fallbackMessages[field] ?? 'Please check this field.'
  }
  return errors
}
