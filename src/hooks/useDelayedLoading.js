import { useEffect, useState } from 'react'

/** Delays only indicator visibility. Each loading cycle starts a fresh timer. */
export default function useDelayedLoading(loading, delay = 200) {
  const [state, setState] = useState({ loading, delay, visible: false })

  // Reset during render so a new cycle cannot reuse an earlier visible state.
  if (state.loading !== loading || state.delay !== delay) {
    setState({ loading, delay, visible: false })
  }

  useEffect(() => {
    if (!loading) return undefined
    let active = true
    const timer = window.setTimeout(() => {
      if (active) setState({ loading, delay, visible: true })
    }, delay)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [loading, delay])

  return loading && state.visible
}
