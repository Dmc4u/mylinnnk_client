import { useContext } from 'react'
import { AuthContext } from './AuthContext.js'

/**
 * Current authentication state and actions:
 *   status: 'loading' | 'authenticated' | 'anonymous' | 'unavailable'
 *   user:   { id, email, displayName, emailVerified, createdAt } | null
 *   notice: 'expired' | 'signed-out' | 'password-reset' | null
 */
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth() must be used inside <AuthProvider>.')
  return value
}
