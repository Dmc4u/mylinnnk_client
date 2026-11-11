/**
 * Background upload of a signed-in user's images to their account (Stage 5).
 *
 * - Only images used by that user's cloud drafts are uploaded (callers decide:
 *   cloud editor, import). Guest drafts and local drafts are never uploaded.
 * - The image's editor id (media_…) is its id on the server too, so the page
 *   format doesn't change and uploads are retry-safe: the same file again is
 *   answered with the stored image.
 * - One upload at a time per tab; an image already queued or uploading is not
 *   queued twice (other tabs are covered by the server: UPLOAD_IN_PROGRESS).
 * - An image counts as synced only when the server confirms it: a 2xx answer
 *   for this id, or the server listing it as available.
 * - Failures keep the local image and are retried (backoff, and when the
 *   connection comes back); permanent ones (conflict, invalid image, quota)
 *   stop and are reported. Local images are never deleted here.
 *
 * Status per (user, image): 'checking' · 'queued' · 'uploading' · 'synced' ·
 * 'failed' · 'unavailable' (not on this device and not on the server yet).
 */
import { remoteMedia } from './mediaService.js'
import { getMedia, markUploaded } from '../storage/mediaStore.js'

const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000]
const PERMANENT = new Set(['MEDIA_ID_CONFLICT', 'INVALID_IMAGE', 'UNSUPPORTED_MEDIA_TYPE', 'IMAGE_TOO_LARGE', 'PAYLOAD_TOO_LARGE', 'STORAGE_QUOTA_EXCEEDED', 'VALIDATION_FAILED'])

const statuses = new Map() // `${userId}:${mediaId}` → { status, message?, permanent? }
const listeners = new Set()
const queue = []
let working = false
let retryTimer = null
let attempts = 0

const keyOf = (userId, mediaId) => `${userId}:${mediaId}`
const notify = () => listeners.forEach((fn) => fn())
const set = (userId, mediaId, value) => {
  statuses.set(keyOf(userId, mediaId), value)
  notify()
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Current status of each id for this user (undefined = not checked yet). */
export function statusesFor(userId, mediaIds) {
  return new Map(mediaIds.map((id) => [id, statuses.get(keyOf(userId, id))]))
}

function scheduleRetry() {
  if (retryTimer) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    retryFailed()
  }, RETRY_DELAYS_MS[Math.min(attempts, RETRY_DELAYS_MS.length - 1)])
  attempts += 1
}

/** Re-queues failed uploads that may succeed now (not permanent failures). */
export function retryFailed({ includePermanent = false } = {}) {
  for (const [key, value] of statuses) {
    if (value?.status !== 'failed' || (value.permanent && !includePermanent) || !value.task) continue
    const [userId, mediaId] = key.split(/:(.*)/s)
    enqueue({ ...value.task, userId, mediaId })
  }
}

function enqueue(task) {
  const key = keyOf(task.userId, task.mediaId)
  const current = statuses.get(key)?.status
  if (current === 'queued' || current === 'uploading' || current === 'synced') return
  set(task.userId, task.mediaId, { status: 'queued', task })
  queue.push(task)
  work()
}

async function work() {
  if (working) return
  working = true
  try {
    while (queue.length) {
      const task = queue.shift()
      const { userId, mediaId, withCsrf } = task
      const record = await getMedia(mediaId)
      if (!record?.blob) {
        set(userId, mediaId, { status: 'unavailable' })
        continue
      }
      set(userId, mediaId, { status: 'uploading', task })
      try {
        const data = await withCsrf((csrf) => remoteMedia.upload(csrf, mediaId, record.blob))
        if (data?.media?.mediaId !== mediaId) throw Object.assign(new Error('The server did not confirm this image.'), { code: 'UNCONFIRMED' })
        await markUploaded(mediaId, userId)
        set(userId, mediaId, { status: 'synced' })
        attempts = 0
      } catch (error) {
        const permanent = PERMANENT.has(error?.code)
        set(userId, mediaId, { status: 'failed', permanent, message: error?.message ?? 'Upload failed.', code: error?.code, task })
        if (!permanent) scheduleRetry()
      }
    }
  } finally {
    working = false
  }
}

/**
 * Makes sure the account has these images: asks the server which it already
 * has, then uploads the missing ones that exist on this device.
 * Returns once the check is done (uploads continue in the background).
 */
export async function syncMedia({ userId, mediaIds, withCsrf }) {
  const ids = [...new Set(mediaIds)].filter((id) => {
    const current = statuses.get(keyOf(userId, id))
    if (current?.status === 'failed' && current.permanent) return false // only an explicit retry tries these again
    return current?.status !== 'synced' && current?.status !== 'queued' && current?.status !== 'uploading'
  })
  if (!userId || !ids.length) return
  ids.forEach((id) => statuses.get(keyOf(userId, id)) || statuses.set(keyOf(userId, id), { status: 'checking' }))
  notify()
  let availability
  try {
    availability = await remoteMedia.availability(ids)
  } catch {
    ids.forEach((id) => set(userId, id, { status: 'failed', message: 'Couldn’t reach MyLinnnk to check your images.', task: { withCsrf, check: true } }))
    scheduleRetry()
    return
  }
  for (const id of availability.available) {
    set(userId, id, { status: 'synced' })
    markUploaded(id, userId)
  }
  for (const id of availability.missing) enqueue({ userId, mediaId: id, withCsrf })
}

if (typeof window !== 'undefined') window.addEventListener('online', () => retryFailed())

/** Tests only: forget all state. */
export function resetMediaSync() {
  statuses.clear()
  queue.length = 0
  working = false
  attempts = 0
  clearTimeout(retryTimer)
  retryTimer = null
  notify()
}
