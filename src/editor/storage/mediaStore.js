/**
 * Uploaded image files, stored as Blobs in IndexedDB (never as base64 in
 * localStorage). Images stay on this device until cloud media storage exists.
 *
 * Ownership
 * Every record lists the drafts that use it in `owners`:
 *   'local:<draftId>'   a draft saved on this device
 *   'cloud:<clientId>'  a cloud draft opened or created on this device
 * One file can have several owners (a copy of a draft, an imported draft),
 * so nothing is duplicated. Deleting a draft only *releases* its ownership;
 * the file is deleted when no owner is left. So deleting an original draft
 * never breaks a copy that uses the same images, and nothing is left orphaned.
 * `draftId` records the draft that uploaded the image (informational).
 *
 * If IndexedDB is unavailable (some private-browsing modes), images are kept
 * in memory for this tab only and the editor warns the user.
 */
import { StorageError } from '../services/errors.js'

const DB_NAME = 'mylinnnk-media'
const DB_VERSION = 2
const STORE = 'media'
const memory = new Map()
let dbPromise = null

export const localOwner = (draftId) => `local:${draftId}`
export const cloudOwner = (clientId) => `cloud:${clientId}`

/** Owners of a record; records from before ownership existed belong to their draft. */
export const ownersOf = (record) => (Array.isArray(record?.owners) ? record.owners : record?.draftId ? [localOwner(record.draftId)] : [])

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new StorageError('unavailable', 'IndexedDB is not available.'))
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      // Tolerates a database that exists without the store (e.g. opened elsewhere without a version).
      const store = db.objectStoreNames.contains(STORE) ? request.transaction.objectStore(STORE) : db.createObjectStore(STORE, { keyPath: 'id' })
      if (!store.indexNames.contains('draftId')) store.createIndex('draftId', 'draftId')
      if (!store.indexNames.contains('owners')) {
        store.createIndex('owners', 'owners', { multiEntry: true })
        // Version 1 records belonged to the local draft that uploaded them.
        store.openCursor().onsuccess = (e) => {
          const cursor = e.target.result
          if (!cursor) return
          if (!Array.isArray(cursor.value.owners)) cursor.update({ ...cursor.value, owners: ownersOf(cursor.value) })
          cursor.continue()
        }
      }
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
        // An IDBRequest resolves to its result (undefined when a key doesn't exist), never to the request itself.
        tx.oncomplete = () => resolve(typeof IDBRequest !== 'undefined' && result instanceof IDBRequest ? result.result : result)
        tx.onerror = () => {
          const quota = tx.error?.name === 'QuotaExceededError'
          reject(new StorageError(quota ? 'quota' : 'unavailable', quota ? 'Browser storage is full.' : 'Image could not be stored.'))
        }
      }),
  )
}

/** Stores a media record (owned by `record.owners`); returns { persisted } (false = memory only for this tab). */
export async function putMedia(record) {
  const stored = { ...record, owners: ownersOf(record) }
  try {
    await run('readwrite', (store) => store.put(stored))
    return { persisted: true }
  } catch (e) {
    if (e.reason === 'quota') throw e
    memory.set(stored.id, stored)
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

/** Every image owned by `owner` (a draft's media library), oldest first. */
export async function listMedia(owner) {
  const fromMemory = [...memory.values()].filter((r) => ownersOf(r).includes(owner))
  try {
    const stored = await run('readonly', (store) => store.index('owners').getAll(owner))
    return [...stored, ...fromMemory].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  } catch {
    return fromMemory
  }
}

/** Atomically changes a record's owners; deletes the file when none are left. Returns the new owners (null if missing). */
async function updateOwners(id, change) {
  if (memory.has(id)) {
    const record = memory.get(id)
    const owners = change(ownersOf(record))
    if (owners.length) memory.set(id, { ...record, owners })
    else memory.delete(id)
    return owners
  }
  const out = { owners: null }
  try {
    // Read and write in one readwrite transaction, so concurrent claims/releases can't interleave.
    await run('readwrite', (store) => {
      store.get(id).onsuccess = (e) => {
        const record = e.target.result
        if (!record) return
        out.owners = change(ownersOf(record))
        if (out.owners.length) store.put({ ...record, owners: out.owners })
        else store.delete(id)
      }
    })
  } catch {
    return null
  }
  return out.owners
}

/** Adds `owner` to each existing image (a copy, an import or a draft opened here starts using them). */
export async function claimMedia(ids, owner) {
  for (const id of new Set(ids)) await updateOwners(id, (owners) => (owners.includes(owner) ? owners : [...owners, owner]))
}

/** `owner` stops using one image; the file is deleted only if nobody else uses it. */
export const releaseMedia = (id, owner) => updateOwners(id, (owners) => owners.filter((o) => o !== owner))

/** Releases everything `owner` uses (its draft was deleted). Images other drafts use are kept. */
export async function releaseOwnerMedia(owner) {
  for (const record of await listMedia(owner)) await releaseMedia(record.id, owner)
}

/**
 * Records that `userId`'s account confirmed it stores this image (uploaded, or
 * found already there). Informational only: the local file is never deleted
 * because of it (Stage 5 keeps every local copy).
 */
export async function markUploaded(id, userId) {
  const at = new Date().toISOString()
  const apply = (record) => ({ ...record, uploaded: { ...(record.uploaded ?? {}), [userId]: at } })
  if (memory.has(id)) {
    memory.set(id, apply(memory.get(id)))
    return
  }
  try {
    await run('readwrite', (store) => {
      store.get(id).onsuccess = (e) => {
        if (e.target.result) store.put(apply(e.target.result))
      }
    })
  } catch {
    /* the server still has it; only this note is missing */
  }
}
