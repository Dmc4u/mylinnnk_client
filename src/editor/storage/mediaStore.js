/**
 * Uploaded image files for guest drafts, stored as Blobs in IndexedDB
 * (never as base64 in localStorage). Records are scoped to a draft so deleting
 * a draft removes its images.
 *
 * If IndexedDB is unavailable (some private-browsing modes), images are kept
 * in memory for this tab only and the editor warns the user.
 */
import { StorageError } from '../services/errors.js'

const DB_NAME = 'mylinnnk-media'
const STORE = 'media'
const memory = new Map()
let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new StorageError('unavailable', 'IndexedDB is not available.'))
    const request = window.indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' })
      store.createIndex('draftId', 'draftId')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new StorageError('unavailable', 'Image storage could not be opened.'))
  }).catch((e) => {
    dbPromise = null
    throw e
  })
  return dbPromise
}

function run(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const result = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(result?.result ?? result)
        tx.onerror = () => {
          const quota = tx.error?.name === 'QuotaExceededError'
          reject(new StorageError(quota ? 'quota' : 'unavailable', quota ? 'Browser storage is full.' : 'Image could not be stored.'))
        }
      }),
  )
}

/** Stores a media record; returns { persisted } (false = memory only for this tab). */
export async function putMedia(record) {
  try {
    await run('readwrite', (store) => store.put(record))
    return { persisted: true }
  } catch (e) {
    if (e.reason === 'quota') throw e
    memory.set(record.id, record)
    return { persisted: false }
  }
}

export async function getMedia(id) {
  if (memory.has(id)) return memory.get(id)
  try {
    return (await run('readonly', (store) => store.get(id))) ?? null
  } catch {
    return null
  }
}

export async function listMedia(draftId) {
  const fromMemory = [...memory.values()].filter((r) => r.draftId === draftId)
  try {
    const stored = await run('readonly', (store) => store.index('draftId').getAll(draftId))
    return [...stored, ...fromMemory].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  } catch {
    return fromMemory
  }
}

export async function deleteMedia(id) {
  memory.delete(id)
  try {
    await run('readwrite', (store) => store.delete(id))
  } catch {
    /* nothing stored */
  }
}

export async function deleteDraftMedia(draftId) {
  const records = await listMedia(draftId)
  await Promise.all(records.map((r) => deleteMedia(r.id)))
}
