import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import BrandMark from '../../components/Brand/BrandMark.jsx'
import NeonRingLoader from '../../components/Loading/NeonRingLoader.jsx'
import useDelayedLoading from '../../hooks/useDelayedLoading.js'
import { TEMPLATES, getTemplateBySlug } from '../../data/templates.js'
import { authHref } from '../../auth/redirects.js'
import { useAuth } from '../../auth/useAuth.js'
import { createPageFromTemplate, validatePage } from '../../editor/model/page.js'
import { cloudDraftApi, fromCloudDraft } from '../../editor/services/cloudDrafts.js'
import { localDrafts } from '../../editor/services/draftService.js'
import { isLocalStorageAvailable } from '../../editor/storage/localDraftStore.js'
import { readRecovery, removeRecovery } from '../../editor/storage/recoveryStore.js'
import Editor from '../../editor/ui/Editor.jsx'
import '../../editor/ui/editor.css'

const templatesBySlug = Object.fromEntries(TEMPLATES.map((t) => [t.slug, t]))
const templateExists = (slug) => templatesBySlug[slug]?.status === 'available'

/** True when two pages have the same editable content. */
const sameContent = (a, b) =>
  JSON.stringify([a.title, a.theme, a.sections]) === JSON.stringify([b.title, b.theme, b.sections])

function EditorMessage({ title, children, actions }) {
  return (
    <div className="ed-message">
      <title>{`${title} · MyLinnnk editor`}</title>
      <BrandMark size={52} />
      <h1>{title}</h1>
      <div className="ed-message__text">{children}</div>
      <div className="ed-message__actions">{actions}</div>
    </div>
  )
}

/**
 * /editor/:templateSlug
 *   ?draft=<id>    a draft saved on this device (guest drafts)
 *   ?page=<id>     a cloud draft in the signed-in user's account
 *   ?recover=<id>  unsaved changes kept on this device for a cloud draft that was never saved
 *   ?new=1         a fresh copy of the template
 * Without a parameter it offers to resume this template's drafts, or starts fresh.
 *
 * A new page is a cloud draft when the user is signed in (saved to the account
 * from the first edit) and a local draft otherwise. The editor never requires
 * an account. Once a draft is open, sign-in changes never replace it.
 */
export default function EditorPage() {
  const { templateSlug } = useParams()
  const [params] = useSearchParams()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { status: authStatus, user, refreshSession } = useAuth()
  const template = getTemplateBySlug(templateSlug)
  const draftId = params.get('draft')
  const pageId = params.get('page')
  const recoverId = params.get('recover')
  const wantsNew = params.get('new') === '1'
  const storageOk = useMemo(() => isLocalStorageAvailable(), [])
  const signedIn = authStatus === 'authenticated'
  const authKnown = authStatus !== 'loading'
  const userId = user?.id ?? null

  const [state, setState] = useState({ phase: 'loading' })
  const showLoader = useDelayedLoading(state.phase === 'loading')
  const [drafts, setDrafts] = useState([])
  const [cloudDrafts, setCloudDrafts] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  // What is open right now, so URL updates after a first save don't reload it.
  const openRef = useRef(null)
  const requestKey = `${templateSlug}|${draftId}|${pageId}|${recoverId}|${wantsNew}|${reloadKey}`

  const refreshDrafts = useCallback(async () => {
    setDrafts(await localDrafts.listDrafts().catch(() => []))
    if (signedIn) setCloudDrafts(await cloudDraftApi.list().catch(() => null))
  }, [signedIn])

  useEffect(() => {
    if (!template || template.status !== 'available' || !authKnown) return undefined
    const open = openRef.current
    if (open && (open.requestKey === requestKey || (pageId && open.cloudId === pageId) || (draftId && open.mode === 'local' && open.clientId === draftId))) {
      open.requestKey = requestKey
      return undefined
    }
    let cancelled = false
    const ready = (next) => {
      openRef.current = { requestKey, mode: next.mode, clientId: next.page.id, cloudId: next.cloud?.id ?? null }
      setState({ phase: 'ready', ...next })
    }
    ;(async () => {
      const all = storageOk ? await localDrafts.listDrafts().catch(() => []) : []
      const cloudList = signedIn ? await cloudDraftApi.list().catch(() => null) : null
      if (cancelled) return
      setDrafts(all)
      setCloudDrafts(cloudList)

      if (pageId || recoverId) {
        if (!signedIn) return setState({ phase: 'signin', unavailable: authStatus === 'unavailable' })
        if (recoverId) {
          const entry = readRecovery(userId, recoverId)
          if (entry?.serverId) return navigate(`/editor/${template.slug}?page=${entry.serverId}`, { replace: true })
          const checked = entry && entry.templateSlug === template.slug ? validatePage(entry.page, { templateExists }) : { ok: false }
          if (!checked.ok) return setState({ phase: 'error', missing: true, recovery: true })
          return ready({ mode: 'cloud', page: { ...checked.page, storage: 'cloud' }, cloud: null, ownerId: userId, recovery: { ...entry, unsavedNew: true } })
        }
        try {
          const converted = fromCloudDraft(await cloudDraftApi.get(pageId))
          if (cancelled) return
          if (!converted.ok || converted.page.templateSlug !== template.slug) return setState({ phase: 'error', errors: converted.errors ?? ['This draft belongs to another template.'] })
          let recovery = readRecovery(userId, converted.page.id)
          if (recovery && sameContent(recovery.page, converted.page)) {
            removeRecovery(userId, converted.page.id) // already saved: nothing to recover
            recovery = null
          }
          return ready({ mode: 'cloud', page: converted.page, cloud: converted.cloud, ownerId: userId, recovery })
        } catch (error) {
          if (cancelled) return
          if (error?.status === 401) return setState({ phase: 'signin' })
          if (error?.code === 'DRAFT_DELETED') return setState({ phase: 'error', deleted: true })
          if (error?.status === 404) return setState({ phase: 'error', missing: true, cloud: true })
          return setState({ phase: 'error', offline: true, message: error?.message })
        }
      }

      if (draftId) {
        const result = await localDrafts.loadDraft(draftId).catch((e) => ({ ok: false, errors: [e.message] }))
        if (cancelled) return
        if (result.ok && result.page.templateSlug === template.slug) return ready({ mode: 'local', page: result.page, stored: true })
        return setState({ phase: 'error', missing: result.missing, errors: result.errors ?? ['This draft belongs to another template.'] })
      }

      const localForTemplate = all.filter((d) => d.templateSlug === template.slug)
      const cloudForTemplate = (cloudList ?? []).filter((d) => d.templateSlug === template.slug)
      if (!wantsNew && (localForTemplate.length || cloudForTemplate.length)) {
        openRef.current = null
        return setState({ phase: 'choose', drafts: localForTemplate, cloudDrafts: cloudForTemplate })
      }
      ready({ mode: signedIn ? 'cloud' : 'local', page: createPageFromTemplate(template), stored: false, cloud: null, ownerId: userId })
    })()
    return () => {
      cancelled = true
    }
  }, [template, requestKey, draftId, pageId, recoverId, wantsNew, storageOk, authKnown, signedIn, authStatus, userId, navigate])

  const onCloudCreated = useCallback(
    (draft) => {
      if (openRef.current) openRef.current.cloudId = draft.id
      navigate(`/editor/${draft.templateSlug}?page=${draft.id}`, { replace: true })
      // (the Drafts list refreshes when the editor reports the save)
    },
    [navigate],
  )

  if (!template) {
    return (
      <EditorMessage title="Template not found" actions={<Link className="ed-btn ed-btn--primary" to="/templates">Browse templates</Link>}>
        <p>We couldn’t find a template called “{templateSlug}”. It may have been renamed or removed.</p>
      </EditorMessage>
    )
  }

  if (template.status !== 'available') {
    return (
      <EditorMessage
        title={`${template.name} is coming soon`}
        actions={
          <>
            <Link className="ed-btn" to={`/templates/${template.slug}`}>Preview it</Link>
            <Link className="ed-btn ed-btn--primary" to="/templates">Choose another template</Link>
          </>
        }
      >
        <p>This template can’t be edited yet. You can preview it now and start editing as soon as it launches.</p>
      </EditorMessage>
    )
  }

  if (state.phase === 'loading') {
    return (
      <main className="neon-loading-region" aria-busy="true">
        {showLoader && <NeonRingLoader mode="full-page" size="lg" message="Opening the editor…" />}
      </main>
    )
  }

  if (state.phase === 'signin') {
    return (
      <EditorMessage
        title={state.unavailable ? 'We can’t reach MyLinnnk' : 'Log in to open this draft'}
        actions={
          state.unavailable ? (
            <button type="button" className="ed-btn ed-btn--primary" onClick={() => refreshSession()}>Try again</button>
          ) : (
            <>
              <Link className="ed-btn" to="/templates">Back to templates</Link>
              <Link className="ed-btn ed-btn--primary" to={authHref('login', `${pathname}${search}`)}>Log in</Link>
            </>
          )
        }
      >
        <p>
          {state.unavailable
            ? 'Your account can’t be checked right now, so this cloud draft can’t be opened yet. Drafts on this device still work.'
            : 'This draft is saved in a MyLinnnk account. Log in to that account to keep editing it.'}
        </p>
      </EditorMessage>
    )
  }

  if (state.phase === 'choose') {
    const openButton = (d, href, meta) => (
      <li key={d.id}>
        <button type="button" className="ed-drafts__open" onClick={() => navigate(href, { replace: true })}>
          <span className="ed-drafts__title">{d.title || 'Untitled page'}</span>
          <span className="ed-drafts__meta">{meta} · last edited {new Date(d.updatedAt).toLocaleString()}</span>
        </button>
      </li>
    )
    const total = state.drafts.length + state.cloudDrafts.length
    return (
      <EditorMessage
        title={`Continue editing ${template.name}?`}
        actions={
          <>
            <Link className="ed-btn" to="/templates">Back to templates</Link>
            <button type="button" className="ed-btn ed-btn--primary" onClick={() => navigate(`/editor/${template.slug}?new=1`, { replace: true })}>
              Start a fresh draft
            </button>
          </>
        }
      >
        <p>You have {total === 1 ? 'a draft' : `${total} drafts`} of this template.</p>
        <ul className="ed-message__drafts">
          {state.cloudDrafts.map((d) => openButton(d, `/editor/${template.slug}?page=${d.id}`, 'In your account'))}
          {state.drafts.map((d) => openButton(d, `/editor/${template.slug}?draft=${d.id}`, 'On this device'))}
        </ul>
      </EditorMessage>
    )
  }

  if (state.phase === 'error') {
    const fresh = (
      <button type="button" className="ed-btn ed-btn--primary" onClick={() => navigate(`/editor/${template.slug}?new=1`, { replace: true })}>
        Start a fresh draft
      </button>
    )
    if (state.offline) {
      return (
        <EditorMessage
          title="We couldn’t open this draft"
          actions={
            <>
              <Link className="ed-btn" to="/templates">Back to templates</Link>
              <button type="button" className="ed-btn ed-btn--primary" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
            </>
          }
        >
          <p>{state.message ?? 'MyLinnnk can’t be reached right now.'} Your draft is safe in your account.</p>
        </EditorMessage>
      )
    }
    return (
      <EditorMessage
        title={state.deleted ? 'This draft was deleted' : state.missing ? 'Draft not found' : 'This draft can’t be opened'}
        actions={
          <>
            {!state.missing && !state.deleted && draftId && (
              <button
                type="button"
                className="ed-btn"
                onClick={async () => {
                  await localDrafts.deleteDraft(draftId).catch(() => {})
                  navigate(`/editor/${template.slug}?new=1`, { replace: true })
                }}
              >
                Delete damaged draft
              </button>
            )}
            {fresh}
          </>
        }
      >
        <p>
          {state.deleted
            ? 'It was deleted from your account. Deleted drafts are kept for 30 days and then removed.'
            : state.cloud
              ? 'It may have been deleted, or it belongs to a different account.'
              : state.recovery
                ? 'There are no unsaved changes for it on this device.'
                : state.missing
                  ? 'It may have been deleted, or it was saved in a different browser or device.'
                  : 'The saved data is damaged or from an incompatible version, so it was not loaded.'}
        </p>
      </EditorMessage>
    )
  }

  return (
    <>
      <title>{`Editing ${state.page.title} · MyLinnnk`}</title>
      <Editor
        key={`${state.mode}:${state.page.id}`}
        template={template}
        mode={state.mode}
        initialPage={state.page}
        initiallyStored={state.stored}
        initialCloud={state.cloud}
        ownerId={state.ownerId}
        recovery={state.recovery}
        drafts={drafts}
        cloudDrafts={signedIn ? cloudDrafts : null}
        templatesBySlug={templatesBySlug}
        storageOk={storageOk}
        onDraftsChanged={refreshDrafts}
        onCloudCreated={onCloudCreated}
        onOpenDraft={(d) => navigate(`/editor/${d.templateSlug}?draft=${d.id}`)}
        onOpenCloudDraft={(d) => navigate(`/editor/${d.templateSlug}?page=${d.id}`)}
        onNewDraft={() => navigate(`/editor/${template.slug}?new=1`)}
        onDeleteDraft={async (d) => {
          await localDrafts.deleteDraft(d.id).catch(() => {})
          await refreshDrafts()
          if (d.id === state.page.id) navigate(`/editor/${template.slug}?new=1`, { replace: true })
        }}
      />
    </>
  )
}
