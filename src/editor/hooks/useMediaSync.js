import { useEffect, useMemo, useReducer } from 'react'
import { retryFailed, statusesFor, subscribe, syncMedia } from '../services/mediaSync.js'

/**
 * Keeps a cloud draft's images uploaded to the owner's account and reports
 * their status. Runs when the draft opens, when the images it uses change
 * (uploads, new copies) and when the connection comes back. Disabled for
 * guests and local drafts: those images are never uploaded automatically.
 *
 * Returns:
 *   summary   { total, synced, uploading, failed, waiting } (waiting = on no device we can see yet)
 *   remoteIds ids the server confirmed it has (renderable from the account)
 *   checked   true once every id has been checked with the server
 *   failures  [{ mediaId, message }] for failed uploads
 *   retry()   retries failed uploads now
 */
export default function useMediaSync({ enabled, userId, mediaIds, withCsrf }) {
  const [, rerender] = useReducer((n) => n + 1, 0)
  const key = [...new Set(mediaIds)].sort().join(',')

  useEffect(() => subscribe(rerender), [])

  useEffect(() => {
    if (!enabled || !userId || !key) return undefined
    const run = () => syncMedia({ userId, mediaIds: key.split(','), withCsrf })
    run()
    window.addEventListener('online', run)
    return () => window.removeEventListener('online', run)
  }, [enabled, userId, key, withCsrf])

  const ids = useMemo(() => (key ? key.split(',') : []), [key])
  const current = enabled && userId ? statusesFor(userId, ids) : new Map()
  const summary = { total: ids.length, synced: 0, uploading: 0, failed: 0, waiting: 0 }
  const remoteIds = new Set()
  const failures = []
  let checked = true
  for (const id of ids) {
    const value = current.get(id)
    const status = value?.status
    if (!status || status === 'checking') checked = false
    if (status === 'synced') {
      summary.synced += 1
      remoteIds.add(id)
    } else if (status === 'queued' || status === 'uploading' || status === 'checking') summary.uploading += 1
    else if (status === 'failed') {
      summary.failed += 1
      failures.push({ mediaId: id, message: value.message })
    } else if (status === 'unavailable') summary.waiting += 1
  }

  // "Retry uploads" is explicit, so it also retries failures that automatic retries skip.
  return { enabled: Boolean(enabled && userId), summary, remoteIds, checked: !enabled || checked, failures, retry: () => retryFailed({ includePermanent: true }) }
}
