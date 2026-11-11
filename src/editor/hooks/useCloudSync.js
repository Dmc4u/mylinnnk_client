import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { collectMediaIds, newId } from '../model/page.js'
import { cloudDraftApi, fromCloudDraft, toCloudContent } from '../services/cloudDrafts.js'
import { claimMedia, cloudOwner } from '../storage/mediaStore.js'
import { removeRecovery, saveRecovery } from '../storage/recoveryStore.js'

/** Autosave waits this long after the last edit. */
export const CLOUD_SAVE_DELAY_MS = 2000
/** Retries after network failures: 5 s, 15 s, 30 s, then every minute (and immediately when back online). */
const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000]

/**
 * Saves a signed-in user's draft to their account (MongoDB via the API).
 *
 * - The first real edit creates the cloud draft (POST, retry-safe by the
 *   editor's draft id); later edits PATCH it with If-Match: "<revision>".
 * - One request at a time; edits made meanwhile are saved right after.
 * - "Saved to your account" only after the server confirms the content.
 * - Until then a recovery copy (scoped to this account) keeps the edits in
 *   this browser, so going offline, an expired session, a conflict or a
 *   closed tab never loses work.
 * - A revision conflict, a deleted draft or a change of account stops
 *   autosaving; nothing is overwritten. The editor offers the next step.
 *
 * Statuses: new · saving · saved · offline · expired · wrong-account ·
 *           conflict · deleted · error
 */
export default function useCloudSync({ page, editRevision, enabled, initialCloud, ownerId, onCreated }) {
  const { status: authStatus, user, withCsrf } = useAuth()
  const [problem, setProblem] = useState(null) // { status, message } for anything other than saving/saved
  const [confirmedRevision, setConfirmedRevision] = useState(0)
  const [savedAt, setSavedAt] = useState(initialCloud ? page.updatedAt : null)
  const [cloud, setCloud] = useState(initialCloud ? { id: initialCloud.id, revision: initialCloud.revision } : null)

  const cloudRef = useRef(cloud)
  const latest = useRef({ page, editRevision })
  const confirmedRef = useRef(0)
  const inFlight = useRef(false)
  const queued = useRef(false)
  const timer = useRef(null)
  const retries = useRef(0)
  const stopped = useRef(null) // 'conflict' | 'deleted' while autosave is paused for the user to decide
  const onCreatedRef = useRef(onCreated)
  const authRef = useRef({ ok: false, signedIn: false })
  const saveRef = useRef(null) // the latest save(), for timers

  const authOk = authStatus === 'authenticated' && user?.id === ownerId
  useEffect(() => {
    latest.current = { page, editRevision }
    onCreatedRef.current = onCreated
    authRef.current = { ok: authOk, signedIn: authStatus === 'authenticated' }
  })

  const keepRecovery = useCallback(() => {
    const { page: current } = latest.current
    saveRecovery(ownerId, {
      clientId: current.id,
      serverId: cloudRef.current?.id ?? null,
      baseRevision: cloudRef.current?.revision ?? null,
      templateSlug: current.templateSlug,
      title: current.title,
      page: current,
    })
  }, [ownerId])

  const schedule = useCallback((delay) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => saveRef.current(), delay)
  }, [])

  const handleError = useCallback(
    (error) => {
      const code = error?.code
      if (code === 'REVISION_CONFLICT' || code === 'CLIENT_ID_CONFLICT') {
        stopped.current = 'conflict'
        setProblem({ status: 'conflict', message: 'This draft was changed somewhere else (another tab or device).' })
      } else if (code === 'DRAFT_DELETED') {
        stopped.current = 'deleted'
        setProblem({ status: 'deleted', message: 'This draft was deleted from your account.' })
      } else if (code === 'SESSION_CHANGED') {
        setProblem({ status: 'wrong-account', message: error.message })
      } else if (error?.status === 401) {
        setProblem({ status: 'expired', message: 'Your session has expired.' })
      } else if (error?.status === 0 || error?.isUnavailable || error?.status === 429) {
        setProblem({ status: 'offline', message: error.message })
        schedule(RETRY_DELAYS_MS[Math.min(retries.current, RETRY_DELAYS_MS.length - 1)])
        retries.current += 1
      } else {
        // Invalid content, too large, draft limit… Not retried automatically; the next edit tries again.
        setProblem({ status: 'error', message: error?.message ?? 'Your changes could not be saved to your account.' })
      }
    },
    [schedule],
  )

  const save = useCallback(async () => {
    clearTimeout(timer.current)
    if (!enabled || stopped.current) return
    if (inFlight.current) {
      queued.current = true
      return
    }
    const { page: current, editRevision: revision } = latest.current
    if (revision === 0 || revision === confirmedRef.current) return
    if (!authRef.current.ok) {
      setProblem(
        authRef.current.signedIn
          ? { status: 'wrong-account', message: 'You’re signed in to a different account than the one this draft belongs to.' }
          : { status: 'expired', message: 'You’re not signed in.' },
      )
      return
    }
    let content
    try {
      content = toCloudContent(current)
    } catch (error) {
      setProblem({ status: 'error', message: error.message })
      return
    }

    inFlight.current = true
    try {
      let draft
      if (!cloudRef.current) {
        const result = await withCsrf((csrf) => cloudDraftApi.create(csrf, current.id, content))
        draft = result.draft
        if (!result.created && draft.revision !== 1) {
          // An earlier save of this draft was already edited elsewhere: don't treat ours as saved.
          cloudRef.current = { id: draft.id, revision: draft.revision }
          setCloud(cloudRef.current)
          onCreatedRef.current?.(draft)
          throw Object.assign(new Error('conflict'), { code: 'REVISION_CONFLICT' })
        }
      } else {
        draft = await withCsrf((csrf) => cloudDraftApi.update(csrf, cloudRef.current.id, cloudRef.current.revision, content))
      }
      const isNew = !cloudRef.current
      cloudRef.current = { id: draft.id, revision: draft.revision }
      setCloud(cloudRef.current)
      if (isNew) onCreatedRef.current?.(draft)
      retries.current = 0
      confirmedRef.current = revision
      setConfirmedRevision(revision)
      setSavedAt(draft.updatedAt)
      setProblem(null)
      if (latest.current.editRevision === revision) removeRecovery(ownerId, current.id)
      else {
        keepRecovery() // newer edits still pending: keep them, now based on the new revision
        queued.current = true
      }
    } catch (error) {
      keepRecovery()
      handleError(error)
    } finally {
      inFlight.current = false
      if (queued.current && !stopped.current) {
        queued.current = false
        schedule(CLOUD_SAVE_DELAY_MS)
      }
    }
  }, [enabled, handleError, keepRecovery, ownerId, schedule, withCsrf])

  useEffect(() => {
    saveRef.current = save
  }, [save])

  // Every edit: keep a recovery copy right away, save to the account ~2 s after editing stops.
  useEffect(() => {
    if (!enabled || editRevision === 0 || editRevision === confirmedRef.current) return
    keepRecovery()
    if (!stopped.current) schedule(CLOUD_SAVE_DELAY_MS)
  }, [enabled, editRevision, keepRecovery, schedule])

  // Signed back in to the right account, or back online: try again.
  useEffect(() => {
    if (enabled && authOk) schedule(0)
  }, [enabled, authOk, schedule])

  useEffect(() => {
    if (!enabled) return undefined
    const onOnline = () => schedule(0)
    const onHide = () => {
      if (document.visibilityState === 'hidden') saveRef.current()
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onHide)
      clearTimeout(timer.current)
    }
  }, [enabled, schedule])

  const pending = enabled && editRevision !== 0 && editRevision !== confirmedRevision
  const status = !enabled ? 'disabled' : problem?.status ?? (pending ? 'saving' : cloud ? 'saved' : 'new')

  // Warn before closing the tab while edits haven't reached the account.
  useEffect(() => {
    if (!enabled || !(pending || problem)) return undefined
    const onBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [enabled, pending, problem])

  /** Fetches the newest cloud version (for "Load newer cloud version"). */
  const fetchLatest = useCallback(async () => {
    const draft = await cloudDraftApi.get(cloudRef.current.id)
    const converted = fromCloudDraft(draft)
    if (!converted.ok) throw new Error('The newer version could not be opened.')
    return converted
  }, [])

  /** After the editor has switched to the server's version: clean state, no recovery copy. */
  const acceptServerVersion = useCallback(
    ({ page: serverPage, cloud: serverCloud }) => {
      removeRecovery(ownerId, serverPage.id)
      stopped.current = null
      retries.current = 0
      cloudRef.current = { id: serverCloud.id, revision: serverCloud.revision }
      confirmedRef.current = 0
      setCloud(cloudRef.current)
      setConfirmedRevision(0)
      setSavedAt(serverPage.updatedAt)
      setProblem(null)
    },
    [ownerId],
  )

  /**
   * Saves a version (default: the current editor content) as a separate cloud
   * draft with a new clientId. The original cloud draft is left untouched.
   */
  const saveAsCopy = useCallback(
    async (version) => {
      const { page: current } = latest.current
      const source = version ?? current
      const content = { ...toCloudContent(source), title: `${source.title || 'Untitled page'} (copy)`.slice(0, 120) }
      const { draft } = await withCsrf((csrf) => cloudDraftApi.create(csrf, newId('draft'), content))
      // The copy owns the images it uses on this device, independently of the original.
      await claimMedia([...collectMediaIds(source)], cloudOwner(draft.clientId))
      if (!version) {
        removeRecovery(ownerId, current.id)
        stopped.current = 'copied'
      }
      return draft
    },
    [ownerId, withCsrf],
  )

  const retry = useCallback(() => {
    if (stopped.current === 'conflict' || stopped.current === 'deleted') return
    setProblem(null)
    schedule(0)
  }, [schedule])

  return {
    status,
    savedAt,
    message: problem?.message ?? null,
    cloud,
    unsynced: pending || Boolean(problem),
    saveNow: save,
    retry,
    fetchLatest,
    acceptServerVersion,
    saveAsCopy,
  }
}
