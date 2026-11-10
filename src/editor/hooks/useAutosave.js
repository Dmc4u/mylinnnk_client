import { useCallback, useEffect, useRef, useState } from 'react'
import { localDrafts } from '../services/draftService.js'

const DELAY_MS = 700

/**
 * Saves the draft to this browser shortly after each change.
 * A brand-new draft is only written once the user actually edits it, so
 * opening the editor never creates empty drafts.
 */
export default function useAutosave(page, revision, initiallyStored) {
  const [savedRevision, setSavedRevision] = useState(0)
  const [stored, setStored] = useState(initiallyStored)
  const [savedAt, setSavedAt] = useState(initiallyStored ? page.updatedAt : null)
  const [error, setError] = useState(null)
  const latest = useRef({ page, revision })
  useEffect(() => {
    latest.current = { page, revision }
  }, [page, revision])

  const save = useCallback(async () => {
    const { page: current, revision: rev } = latest.current
    try {
      const result = await localDrafts.saveDraft(current)
      setSavedRevision(rev)
      setStored(true)
      setSavedAt(result.updatedAt)
      setError(null)
      return true
    } catch (e) {
      setError(e.message || 'Your changes could not be stored in this browser.')
      return false
    }
  }, [])

  useEffect(() => {
    if (revision === 0 || revision === savedRevision) return undefined
    const timer = setTimeout(save, DELAY_MS)
    return () => clearTimeout(timer)
  }, [revision, savedRevision, save])

  const pending = revision !== savedRevision && revision !== 0
  const status = error ? 'error' : pending ? 'saving' : stored ? 'saved' : 'new'

  // Warn before leaving only if something hasn't reached storage.
  useEffect(() => {
    if (!pending && !error) return undefined
    const onBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [pending, error])

  return { status, stored, savedAt, error, saveNow: save }
}
