import { ApiError, UNAVAILABLE_MESSAGE } from './authApi.js'

/** Banners for AuthProvider `notice` values. */
export const NOTICES = {
  expired: { tone: 'warn', text: 'Your session has expired. Please log in again.' },
  'signed-out': { tone: 'success', text: 'You’ve been logged out. Any drafts you made as a guest are still saved on this device.' },
  'password-reset': {
    tone: 'success',
    text: 'Your password has been changed and you’ve been signed out on every device. Log in with your new password.',
  },
}

/**
 * The message to show for a failed request. API messages are written for
 * people already; anything unexpected gets a generic sentence (never raw
 * error text, request bodies or tokens).
 */
export function errorMessage(error) {
  if (!(error instanceof ApiError)) return UNAVAILABLE_MESSAGE
  if (error.code === 'VALIDATION_FAILED') return 'Please check the highlighted fields.'
  return error.message || UNAVAILABLE_MESSAGE
}
