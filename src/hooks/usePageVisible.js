import { useSyncExternalStore } from 'react'

const subscribe = (callback) => {
  document.addEventListener('visibilitychange', callback)
  return () => document.removeEventListener('visibilitychange', callback)
}

const getSnapshot = () => document.visibilityState !== 'hidden'
const getServerSnapshot = () => true

/** False while the browser tab is in the background. */
export default function usePageVisible() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
