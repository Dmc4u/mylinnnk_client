/**
 * Guest drafts stored in this browser's localStorage.
 *
 * Layout:
 *   mylinnnk.drafts.index.v1   → [{ id, templateSlug, title, updatedAt }]  (small, for listing)
 *   mylinnnk.draft.v1.<id>     → full page JSON (no image blobs, no object URLs)
 *
 * Each draft lives under its own key, so saving one never overwrites another.
 * Image files live separately in IndexedDB (mediaStore.js).
 */
import { StorageError } from '../services/errors.js'

const INDEX_KEY = 'mylinnnk.drafts.index.v1'
const draftKey = (id) => `mylinnnk.draft.v1.${id}`

function storage() {
  try {
    const s = window.localStorage
    const probe = '__mylinnnk_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    throw new StorageError('unavailable', 'This browser is not allowing local storage (private browsing or blocked site data).')
  }
}

const isQuota = (e) => e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014

function readIndex(s) {
  try {
    const raw = JSON.parse(s.getItem(INDEX_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((e) => e && typeof e.id === 'string') : []
  } catch {
    return [] // a corrupt index is rebuilt on the next save
  }
}

export function isLocalStorageAvailable() {
  try {
    storage()
    return true
  } catch {
    return false
  }
}

export function listLocalDrafts() {
  return readIndex(storage()).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
}

/** Returns the raw stored document (validate it before use), or null. */
export function readLocalDraft(id) {
  const raw = storage().getItem(draftKey(id))
  if (raw == null) return null
  try {
    return JSON.parse(raw)
  } catch {
    throw new StorageError('corrupt', 'This draft is damaged and cannot be opened.')
  }
}

export function writeLocalDraft(page) {
  const s = storage()
  try {
    s.setItem(draftKey(page.id), JSON.stringify(page))
    const index = readIndex(s).filter((e) => e.id !== page.id)
    index.push({ id: page.id, templateSlug: page.templateSlug, title: page.title, updatedAt: page.updatedAt })
    s.setItem(INDEX_KEY, JSON.stringify(index))
  } catch (e) {
    if (isQuota(e)) throw new StorageError('quota', 'Browser storage is full. Remove an old draft and try again.')
    throw new StorageError('unavailable', 'Your changes could not be stored in this browser.')
  }
}

export function removeLocalDraft(id) {
  const s = storage()
  s.removeItem(draftKey(id))
  s.setItem(INDEX_KEY, JSON.stringify(readIndex(s).filter((e) => e.id !== id)))
}
