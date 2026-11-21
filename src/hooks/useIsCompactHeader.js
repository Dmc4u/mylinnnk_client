import { useSyncExternalStore } from 'react'

/** Matches the site header's collapse point (components/Header/Header.css: max-width 860px). */
const QUERY = '(max-width: 860px)'

const subscribe = (callback) => {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener?.('change', callback)
  return () => mql.removeEventListener?.('change', callback)
}

const getSnapshot = () => window.matchMedia(QUERY).matches
const getServerSnapshot = () => false

/** True while the site header shows its compact (menu button) layout; follows window resizes. */
export default function useIsCompactHeader() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
