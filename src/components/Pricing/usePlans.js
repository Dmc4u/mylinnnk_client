import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../auth/authApi.js'

/**
 * The public price list from the server (GET /api/v1/plans). One request is
 * shared by every component on the page; a failed request is not cached, so
 * `retry()` (or the next mount) asks again. There are no built-in prices to
 * fall back to: if the server can't be reached, we say so.
 *
 * Returns { status: 'loading' | 'ready' | 'error', data, error, retry }.
 */
let shared = null

function load() {
  if (!shared) {
    shared = apiRequest('/plans').then(
      (data) => {
        if (!Array.isArray(data?.plans) || !data.currency?.code || !Number.isInteger(data.currency.minorUnit)) {
          throw Object.assign(new Error('The price list could not be read.'), { code: 'INVALID_RESPONSE' })
        }
        return data
      },
      (error) => {
        throw error
      },
    )
    shared.catch(() => {
      shared = null
    })
  }
  return shared
}

export default function usePlans() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    load().then(
      (data) => active && setState({ status: 'ready', data, error: null }),
      (error) => active && setState({ status: 'error', data: null, error }),
    )
    return () => {
      active = false
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading', data: null, error: null })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}

/** Tests only: forget the shared response. */
export function resetPlansCache() {
  shared = null
}
