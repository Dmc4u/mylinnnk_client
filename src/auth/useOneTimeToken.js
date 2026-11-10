import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

/** Same shape the API issues: 43 base64url characters. */
export const isWellFormedToken = (token) => typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)

/**
 * Reads the one-time `?token=` from an email link once, keeps it in memory and
 * removes it from the address bar right away, so it doesn't stay in browser
 * history, get bookmarked or leak through the Referer header.
 */
export function useOneTimeToken() {
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [token] = useState(() => params.get('token'))
  const hasTokenInUrl = params.has('token')

  useEffect(() => {
    if (hasTokenInUrl) navigate(pathname, { replace: true })
  }, [hasTokenInUrl, navigate, pathname])

  return token
}
