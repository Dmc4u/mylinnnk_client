import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, authApi } from './authApi.js'
import { AuthContext } from './AuthContext.js'

/** Re-check the session when a tab becomes visible again after this long. */
export const REVALIDATE_AFTER_MS = 5 * 60 * 1000
export const AUTH_CHANNEL = 'mylinnnk-auth'

const SESSION_CHANGED_MESSAGE = 'You signed in to a different account in another tab. Check the account shown and try again.'

/**
 * Application-wide authentication state.
 *
 * Session
 * - Restored on load with one GET /auth/session. Concurrent callers share the
 *   same request (React StrictMode, several components), so the API isn't asked twice.
 * - Re-checked when a tab becomes visible after REVALIDATE_AFTER_MS, when a
 *   page is restored from the back/forward cache, and when another tab signs
 *   in or out (BroadcastChannel; messages carry no user data or tokens).
 * - Responses that arrive after a newer login/logout are ignored (`epoch`), so
 *   a slow request can never put a previous user's state back.
 *
 * Tokens
 * - The session itself is an HttpOnly cookie this code cannot read.
 * - The CSRF token lives only in memory (a ref). It is never written to
 *   localStorage, sessionStorage or the URL, and never logged.
 *
 * Expired sessions
 * - A 401 from a signed-in action, or a session that disappears on re-check,
 *   switches to signed-out with notice 'expired'.
 * - A CSRF_INVALID answer (the session was replaced in another tab) re-reads
 *   the session and retries once, but only if it still belongs to the same user.
 *
 * Admin status
 * - `isAdmin` is the server's own answer (GET /auth/session and POST /auth/login, computed by the
 *   same check every /api/v1/admin request runs). It only decides what to show (the Admin Dashboard
 *   link, where to go after logging in); the admin APIs check every request themselves. It is never
 *   derived from the email or anything else on this side, and is reset to false whenever the
 *   session ends, expires or changes, and re-read with every session check. No extra requests.
 *
 * Guest drafts are never touched here: signing in, signing up or out leaves
 * localStorage drafts and IndexedDB media exactly as they were.
 */
export default function AuthProvider({ children, api = authApi }) {
  const [state, setState] = useState({ status: 'loading', user: null, isAdmin: false, notice: null })
  const csrfRef = useRef(null)
  const userIdRef = useRef(null)
  const epochRef = useRef(0)
  const inflightRef = useRef(null)
  const lastCheckedRef = useRef(0)
  const channelRef = useRef(null)

  const notify = useCallback((type) => {
    try {
      channelRef.current?.postMessage({ type })
    } catch {
      /* another tab simply won't hear about it until it re-checks */
    }
  }, [])

  const setSignedIn = useCallback((user, csrfToken, isAdmin) => {
    csrfRef.current = csrfToken ?? null
    userIdRef.current = user.id
    setState((prev) => ({ status: 'authenticated', user, isAdmin: isAdmin === true, notice: prev.user?.id === user.id ? prev.notice : null }))
  }, [])

  const setSignedOut = useCallback((notice = null) => {
    epochRef.current += 1
    csrfRef.current = null
    userIdRef.current = null
    setState({ status: 'anonymous', user: null, isAdmin: false, notice })
  }, [])

  /** GET /auth/session. Returns the session data, or null if the API couldn't be reached. */
  const refreshSession = useCallback(() => {
    if (inflightRef.current) return inflightRef.current
    const epoch = epochRef.current
    const request = api
      .getSession()
      .then(
        (data) => {
          lastCheckedRef.current = Date.now()
          if (epoch !== epochRef.current) return data // a login/logout happened meanwhile
          if (data?.authenticated && data.user) {
            setSignedIn(data.user, data.csrfToken, data.isAdmin)
          } else {
            const wasSignedIn = userIdRef.current !== null
            csrfRef.current = null
            userIdRef.current = null
            setState((prev) => ({ status: 'anonymous', user: null, isAdmin: false, notice: wasSignedIn ? 'expired' : prev.notice }))
          }
          return data
        },
        () => {
          // Keep a known session through a temporary outage; only a first load becomes 'unavailable'.
          if (epoch === epochRef.current) setState((prev) => (prev.status === 'loading' ? { status: 'unavailable', user: null, isAdmin: false, notice: null } : prev))
          return null
        },
      )
      .finally(() => {
        inflightRef.current = null
      })
    inflightRef.current = request
    return request
  }, [api, setSignedIn])

  useEffect(() => {
    refreshSession()

    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheckedRef.current > REVALIDATE_AFTER_MS) refreshSession()
    }
    const onPageShow = (event) => {
      if (event.persisted) refreshSession()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onPageShow)

    let channel = null
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(AUTH_CHANNEL)
      channel.onmessage = (event) => {
        if (event.data?.type === 'signed-out') setSignedOut('signed-out')
        else if (event.data?.type === 'session-changed') {
          epochRef.current += 1 // whatever this tab was waiting for is out of date
          // Let an in-flight (now stale) request finish, then ask again.
          Promise.resolve(inflightRef.current).finally(() => refreshSession())
        }
      }
      channelRef.current = channel
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageShow)
      channel?.close()
      channelRef.current = null
    }
  }, [refreshSession, setSignedOut])

  /** Signs in locally after login/registration and tells other tabs. */
  const startSession = useCallback(
    (data) => {
      epochRef.current += 1
      lastCheckedRef.current = Date.now()
      setSignedIn(data.user, data.csrfToken, data.isAdmin)
      notify('session-changed')
    },
    [notify, setSignedIn],
  )

  /**
   * Runs a signed-in, state-changing request with the CSRF token and handles
   * expiry: 401 → signed out ('expired'); CSRF_INVALID → re-read the session
   * and retry once if it is still the same user.
   */
  const withCsrf = useCallback(
    async (call) => {
      const expectedUserId = userIdRef.current
      try {
        return await call(csrfRef.current)
      } catch (error) {
        if (error?.code === 'CSRF_INVALID') {
          const data = await refreshSession()
          if (data?.authenticated && data.user?.id === expectedUserId) return call(csrfRef.current)
          if (data?.authenticated) throw new ApiError({ status: 409, code: 'SESSION_CHANGED', message: SESSION_CHANGED_MESSAGE })
          if (data) throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Your session has ended. Please log in again.' })
          throw error
        }
        if (error?.status === 401) {
          setSignedOut('expired')
          notify('session-changed')
        }
        throw error
      }
    },
    [notify, refreshSession, setSignedOut],
  )

  const login = useCallback(
    async ({ email, password }) => {
      const data = await api.login({ email, password })
      startSession(data)
      return { user: data.user, isAdmin: data.isAdmin === true }
    },
    [api, startSession],
  )

  const register = useCallback(
    async ({ email, password, displayName }) => {
      const data = await api.register({ email, password, displayName })
      startSession(data)
      return { user: data.user, verificationEmailSent: data.verificationEmailSent !== false }
    },
    [api, startSession],
  )

  const logout = useCallback(async () => {
    try {
      await withCsrf((csrfToken) => api.logout(csrfToken))
    } catch (error) {
      // Already signed out on the server (expired or revoked): finish locally.
      if (error?.status !== 401) throw error
    }
    setSignedOut('signed-out')
    notify('signed-out')
  }, [api, notify, setSignedOut, withCsrf])

  const verifyEmail = useCallback(
    async (token) => {
      const data = await api.verifyEmail(token)
      // Only update the signed-in user if the link was theirs.
      setState((prev) =>
        prev.status === 'authenticated' && prev.user?.id === data.user?.id ? { ...prev, user: { ...prev.user, emailVerified: true } } : prev,
      )
      notify('session-changed')
      return data
    },
    [api, notify],
  )

  /** Confirms the signed-in user's email with the 6-digit code (CSRF). */
  const verifyEmailCode = useCallback(
    async (code) => {
      const data = await withCsrf((csrfToken) => api.verifyEmailCode(code, csrfToken))
      setState((prev) =>
        prev.status === 'authenticated' && (!data?.user || prev.user?.id === data.user.id) ? { ...prev, user: { ...prev.user, emailVerified: true } } : prev,
      )
      notify('session-changed')
      return data
    },
    [api, notify, withCsrf],
  )

  /** The pending code's timers (never the code). A 401 means the session ended. */
  const getVerification = useCallback(async () => {
    try {
      return await api.getVerification()
    } catch (error) {
      if (error?.status === 401 && userIdRef.current) {
        setSignedOut('expired')
        notify('session-changed')
      }
      throw error
    }
  }, [api, notify, setSignedOut])

  const resendVerification = useCallback(async () => {
    const data = await withCsrf((csrfToken) => api.resendVerification(csrfToken))
    if (data?.alreadyVerified) setState((prev) => (prev.user ? { ...prev, user: { ...prev.user, emailVerified: true } } : prev))
    return data
  }, [api, withCsrf])

  /** Saves the signed-in user's optional notifications (CSRF); the user in context follows the server. */
  const updatePreferences = useCallback(
    async (preferences) => {
      const data = await withCsrf((csrfToken) => api.updatePreferences(preferences, csrfToken))
      if (data?.user) setState((prev) => (prev.status === 'authenticated' && prev.user?.id === data.user.id ? { ...prev, user: { ...prev.user, preferences: data.user.preferences } } : prev))
      return data
    },
    [api, withCsrf],
  )

  const forgotPassword = useCallback((email) => api.forgotPassword(email), [api])

  const resetPassword = useCallback(
    async ({ token, password }) => {
      const data = await api.resetPassword({ token, password })
      // The API has revoked every session for this account.
      setSignedOut('password-reset')
      notify('signed-out')
      return data
    },
    [api, notify, setSignedOut],
  )

  const clearNotice = useCallback(() => setState((prev) => (prev.notice ? { ...prev, notice: null } : prev)), [])

  const value = useMemo(
    () => ({
      ...state,
      isAuthenticated: state.status === 'authenticated',
      refreshSession,
      login,
      register,
      logout,
      verifyEmail,
      verifyEmailCode,
      getVerification,
      resendVerification,
      updatePreferences,
      forgotPassword,
      resetPassword,
      clearNotice,
      withCsrf,
    }),
    [state, refreshSession, login, register, logout, verifyEmail, verifyEmailCode, getVerification, resendVerification, updatePreferences, forgotPassword, resetPassword, clearNotice, withCsrf],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
