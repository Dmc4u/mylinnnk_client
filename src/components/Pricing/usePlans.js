import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../auth/authApi.js'

/**
 * The public price list from the server (GET /api/v1/plans), including `checkout`: whether the
 * server takes payments right now (PAYMENTS_MODE). There are no built-in prices to fall back to:
 * if the server can't be reached, we say so.
 *
 * Components mounted together share one request. A response is reused for SHARED_MAX_AGE_MS only,
 * so a change on the server (e.g. payments switched on) shows up without reloading the app; a failed
 * request is never reused. `fresh: true` (the publishing dialog and page, where someone is about to
 * pay) always asks the server again on mount, joining a request that is already on its way.
 *
 * `display` (e.g. 'ILS'): the currency for display-only estimates (GET /plans?display=ILS); each display
 * currency has its own shared response. Prices to pay are always the NGN prices in the same answer.
 *
 * Returns { status: 'loading' | 'ready' | 'error', data, error, retry }.
 */
export const SHARED_MAX_AGE_MS = 60 * 1000

const sharedByKey = new Map() // display currency ('' for none) → { promise, at, settled }

function load({ fresh = false, display = '' } = {}) {
  const key = /^[A-Z]{3}$/.test(display) ? display : ''
  const shared = sharedByKey.get(key)
  const reusable = shared && (!shared.settled || (!fresh && Date.now() - shared.at < SHARED_MAX_AGE_MS))
  if (!reusable) {
    const entry = { promise: null, at: Date.now(), settled: false }
    entry.promise = apiRequest(key ? `/plans?display=${key}` : '/plans').then((data) => {
      if (!Array.isArray(data?.plans) || !data.currency?.code || !Number.isInteger(data.currency.minorUnit)) {
        throw Object.assign(new Error('The price list could not be read.'), { code: 'INVALID_RESPONSE' })
      }
      return data
    })
    entry.promise.then(
      () => {
        entry.settled = true
        entry.at = Date.now()
      },
      () => {
        if (sharedByKey.get(key) === entry) sharedByKey.delete(key)
      },
    )
    sharedByKey.set(key, entry)
  }
  return sharedByKey.get(key).promise
}

export default function usePlans({ fresh = false, display = '' } = {}) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    load({ fresh, display }).then(
      (data) => active && setState({ status: 'ready', data, error: null }),
      (error) => active && setState({ status: 'error', data: null, error }),
    )
    return () => {
      active = false
    }
  }, [attempt, fresh, display])

  const retry = useCallback(() => {
    setState({ status: 'loading', data: null, error: null })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}

/** Tests only: forget the shared response. */
export function resetPlansCache() {
  sharedByKey.clear()
}
