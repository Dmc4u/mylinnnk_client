import { useCallback, useEffect, useRef, useState } from 'react'
import { localMedia } from '../services/mediaService.js'

/**
 * Uploaded images for one draft, with temporary object URLs for display.
 * URLs live only in memory and are revoked when an image is deleted, when the
 * draft changes and when the editor unmounts (no leaks, never persisted).
 */
export default function useMediaLibrary(draftId) {
  const [records, setRecords] = useState([])
  const [urls, setUrls] = useState(() => new Map())
  const urlsRef = useRef(new Map())

  useEffect(() => {
    let cancelled = false
    const created = urlsRef.current
    localMedia.list(draftId).then((list) => {
      if (cancelled) return
      for (const r of list) if (!created.has(r.id) && r.blob) created.set(r.id, URL.createObjectURL(r.blob))
      setRecords(list.map(({ blob, ...meta }) => ({ ...meta, persisted: blob instanceof Blob })))
      setUrls(new Map(created))
    })
    return () => {
      cancelled = true
      created.forEach((url) => URL.revokeObjectURL(url))
      created.clear()
    }
  }, [draftId])

  const upload = useCallback(
    async (file) => {
      const { mediaId, persisted } = await localMedia.upload(draftId, file)
      const record = await localMedia.get(mediaId)
      if (record?.blob) urlsRef.current.set(mediaId, URL.createObjectURL(record.blob))
      setRecords((list) => [...list, { ...record, blob: undefined, persisted }])
      setUrls(new Map(urlsRef.current))
      return { mediaId, persisted }
    },
    [draftId],
  )

  const remove = useCallback(async (mediaId) => {
    await localMedia.remove(mediaId)
    const url = urlsRef.current.get(mediaId)
    if (url) URL.revokeObjectURL(url)
    urlsRef.current.delete(mediaId)
    setRecords((list) => list.filter((r) => r.id !== mediaId))
    setUrls(new Map(urlsRef.current))
  }, [])

  return { records, urls, upload, remove }
}
