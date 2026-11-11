import { useCallback, useEffect, useRef, useState } from 'react'
import { localMedia } from '../services/mediaService.js'

/**
 * Uploaded images for one draft, with temporary object URLs for display.
 * URLs live only in memory and are revoked when an image is deleted, when the
 * draft changes and when the editor unmounts (no leaks, never persisted).
 *
 * `owner` identifies the draft in the media store ('local:<id>' or
 * 'cloud:<clientId>'). Images the page refers to that this browser has but
 * this draft doesn't own yet (a copy, an imported draft) are claimed for it,
 * so they stay available even if the draft they came from is deleted.
 * `loaded` turns true once this browser has been checked, so callers can tell
 * "not here" from "not checked yet".
 */
export default function useMediaLibrary({ owner, draftId, referencedIds = [] }) {
  const [records, setRecords] = useState([])
  const [urls, setUrls] = useState(() => new Map())
  const [loaded, setLoaded] = useState(false)
  const urlsRef = useRef(new Map())
  const referencedKey = [...referencedIds].sort().join(',')

  useEffect(() => {
    let cancelled = false
    const created = urlsRef.current
    ;(async () => {
      const list = await localMedia.list(owner)
      const claimed = []
      for (const id of referencedKey ? referencedKey.split(',') : []) {
        if (list.some((r) => r.id === id)) continue
        const record = await localMedia.get(id)
        if (!record) continue // not on this device (shown with a fallback)
        await localMedia.claim([id], owner)
        claimed.push(record)
      }
      if (cancelled) return
      const all = [...list, ...claimed]
      for (const r of all) if (!created.has(r.id) && r.blob) created.set(r.id, URL.createObjectURL(r.blob))
      setRecords(all.map(({ blob, ...meta }) => ({ ...meta, persisted: blob instanceof Blob })))
      setUrls(new Map(created))
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [owner, referencedKey])

  // Revoke every URL when the draft changes or the editor closes.
  useEffect(() => {
    const created = urlsRef.current
    return () => {
      created.forEach((url) => URL.revokeObjectURL(url))
      created.clear()
    }
  }, [owner])

  const upload = useCallback(
    async (file) => {
      const { mediaId, persisted } = await localMedia.upload(owner, draftId, file)
      const record = await localMedia.get(mediaId)
      if (record?.blob) urlsRef.current.set(mediaId, URL.createObjectURL(record.blob))
      setRecords((list) => [...list, { ...record, blob: undefined, persisted }])
      setUrls(new Map(urlsRef.current))
      return { mediaId, persisted }
    },
    [owner, draftId],
  )

  /** Removes the image from this draft's library (other drafts using it keep it). */
  const remove = useCallback(async (mediaId) => {
    await localMedia.remove(mediaId, owner)
    const url = urlsRef.current.get(mediaId)
    if (url) URL.revokeObjectURL(url)
    urlsRef.current.delete(mediaId)
    setRecords((list) => list.filter((r) => r.id !== mediaId))
    setUrls(new Map(urlsRef.current))
  }, [owner])

  return { records, urls, loaded, upload, remove }
}
