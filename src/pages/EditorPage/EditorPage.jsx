import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import BrandMark from '../../components/Brand/BrandMark.jsx'
import { TEMPLATES, getTemplateBySlug } from '../../data/templates.js'
import { createPageFromTemplate } from '../../editor/model/page.js'
import { localDrafts } from '../../editor/services/draftService.js'
import { isLocalStorageAvailable } from '../../editor/storage/localDraftStore.js'
import Editor from '../../editor/ui/Editor.jsx'
import '../../editor/ui/editor.css'

const templatesBySlug = Object.fromEntries(TEMPLATES.map((t) => [t.slug, t]))

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
 * /editor/:templateSlug[?draft=<id>|?new=1]
 * Opens an existing local draft, offers to resume drafts for this template,
 * or starts a fresh in-memory copy of the template.
 */
export default function EditorPage() {
  const { templateSlug } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const template = getTemplateBySlug(templateSlug)
  const draftId = params.get('draft')
  const wantsNew = params.get('new') === '1'
  const storageOk = useMemo(() => isLocalStorageAvailable(), [])

  const [state, setState] = useState({ phase: 'loading' })
  const [drafts, setDrafts] = useState([])

  const refreshDrafts = useCallback(async () => {
    try {
      setDrafts(await localDrafts.listDrafts())
    } catch {
      setDrafts([])
    }
  }, [])

  useEffect(() => {
    if (!template || template.status !== 'available') return undefined
    let cancelled = false
    ;(async () => {
      const all = storageOk ? await localDrafts.listDrafts().catch(() => []) : []
      if (cancelled) return
      setDrafts(all)
      if (draftId) {
        if (state.page?.id === draftId) return // already open (URL updated after first save)
        const result = await localDrafts.loadDraft(draftId).catch((e) => ({ ok: false, errors: [e.message] }))
        if (cancelled) return
        if (result.ok && result.page.templateSlug === template.slug) setState({ phase: 'ready', page: result.page, stored: true })
        else setState({ phase: 'error', missing: result.missing, errors: result.errors ?? ['This draft belongs to another template.'] })
        return
      }
      const forTemplate = all.filter((d) => d.templateSlug === template.slug)
      if (!wantsNew && forTemplate.length) setState({ phase: 'choose', drafts: forTemplate })
      else setState({ phase: 'ready', page: createPageFromTemplate(template), stored: false })
    })()
    return () => {
      cancelled = true
    }
    // state.page is read only to avoid reloading the draft that is already open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, draftId, wantsNew, storageOk])

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

  if (state.phase === 'loading') return <div className="ed-loading" role="status">Opening the editor…</div>

  if (state.phase === 'choose') {
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
        <p>You have {state.drafts.length === 1 ? 'a draft' : `${state.drafts.length} drafts`} of this template saved on this device.</p>
        <ul className="ed-message__drafts">
          {state.drafts.map((d) => (
            <li key={d.id}>
              <button type="button" className="ed-drafts__open" onClick={() => navigate(`/editor/${template.slug}?draft=${d.id}`, { replace: true })}>
                <span className="ed-drafts__title">{d.title || 'Untitled page'}</span>
                <span className="ed-drafts__meta">Last edited {new Date(d.updatedAt).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      </EditorMessage>
    )
  }

  if (state.phase === 'error') {
    return (
      <EditorMessage
        title={state.missing ? 'Draft not found' : 'This draft can’t be opened'}
        actions={
          <>
            {!state.missing && (
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
            <button type="button" className="ed-btn ed-btn--primary" onClick={() => navigate(`/editor/${template.slug}?new=1`, { replace: true })}>
              Start a fresh draft
            </button>
          </>
        }
      >
        <p>
          {state.missing
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
        key={state.page.id}
        template={template}
        initialPage={state.page}
        initiallyStored={state.stored}
        drafts={drafts}
        templatesBySlug={templatesBySlug}
        storageOk={storageOk}
        onDraftsChanged={refreshDrafts}
        onOpenDraft={(d) => navigate(`/editor/${d.templateSlug}?draft=${d.id}`)}
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
