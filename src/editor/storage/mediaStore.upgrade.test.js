/** Upgrading the Phase 3 (version 1) image database to ownership (version 2). Own file: it resets modules. */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'

describe('media store upgrade', () => {
  it('images stored before ownership existed belong to their draft after the upgrade', async () => {
    // A version-1 database, as written by Phase 3 (no `owners` field).
    globalThis.indexedDB = new IDBFactory()
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('mylinnnk-media', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('media', { keyPath: 'id' }).createIndex('draftId', 'draftId')
      request.onsuccess = () => {
        const tx = request.result.transaction('media', 'readwrite')
        tx.objectStore('media').put({ id: 'media_legacy0000000001', draftId: 'draft_legacy0000000001', blob: new Blob(['x']), createdAt: '2026-01-01T00:00:00.000Z' })
        tx.oncomplete = () => {
          request.result.close()
          resolve()
        }
      }
      request.onerror = reject
    })
    vi.resetModules()
    const store = await import('./mediaStore.js')
    const upgraded = await store.getMedia('media_legacy0000000001')
    expect(upgraded.owners).toEqual(['local:draft_legacy0000000001'])
    expect((await store.listMedia('local:draft_legacy0000000001')).map((r) => r.id)).toEqual(['media_legacy0000000001'])
  })
})
