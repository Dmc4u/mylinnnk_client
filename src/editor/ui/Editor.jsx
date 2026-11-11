import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { SECTION_TYPES } from '../../templates/schema.js'
import useAutosave from '../hooks/useAutosave.js'
import useCloudSync from '../hooks/useCloudSync.js'
import useMediaLibrary from '../hooks/useMediaLibrary.js'
import { resolveMediaForRender } from '../model/mediaFallback.js'
import useEditorHistory from '../model/useEditorHistory.js'
import { addSection, duplicateSection, moveSection, moveSectionTo, removeSection, setTitle } from '../model/operations.js'
import { collectMediaIds, newId, pageForRender } from '../model/page.js'
import { cloudOwner, localOwner } from '../storage/mediaStore.js'
import { removeRecovery } from '../storage/recoveryStore.js'
import { useAuth } from '../../auth/useAuth.js'
import { publishing } from '../services/accountServices.js'
import Canvas from './Canvas.jsx'
import { ConfirmDialog, ConflictDialog, PublishDialog, SaveDraftDialog } from './Dialogs.jsx'
import EditorBanners from './EditorBanners.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import { AddSectionPanel, DraftsPanel, MediaPanel, StructurePanel, ThemePanel } from './SidebarPanels.jsx'
import Toolbar from './Toolbar.jsx'
import Icon from './icons.jsx'

const TABS = [
  { id: 'structure', label: 'Sections', icon: 'layers' },
  { id: 'add', label: 'Add', icon: 'plus' },
  { id: 'theme', label: 'Theme', icon: 'palette' },
  { id: 'media', label: 'Media', icon: 'image' },
  { id: 'drafts', label: 'Drafts', icon: 'folder' },
]

const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/** Toolbar wording for cloud-draft save states. */
const CLOUD_STATUS_TEXT = {
  new: 'Not saved yet',
  saving: 'Saving…',
  saved: 'Saved to your account',
  offline: 'Offline / not saved',
  expired: 'Session expired',
  'wrong-account': 'Not saved: other account',
  conflict: 'Conflict',
  deleted: 'Deleted from your account',
  error: 'Not saved',
}
const CLOUD_STATUS_CLASS = { new: 'new', saving: 'saving', saved: 'saved' }

/**
 * mode 'local'  guest-style draft saved in this browser (unchanged Phase 3 behaviour).
 * mode 'cloud'  draft saved to the signed-in user's account (useCloudSync), with a
 *               recovery copy in this browser until the server confirms each save.
 */
export default function Editor({
  template,
  mode = 'local',
  initialPage,
  initiallyStored,
  initialCloud = null,
  ownerId = null,
  recovery = null,
  drafts,
  cloudDrafts = null,
  templatesBySlug,
  storageOk,
  onDraftsChanged,
  onCloudCreated,
  onOpenDraft,
  onOpenCloudDraft,
  onNewDraft,
  onDeleteDraft,
}) {
  const navigate = useNavigate()
  const history = useEditorHistory(initialPage)
  const { page, apply, undo, redo } = history
  const isCloud = mode === 'cloud'
  const autosave = useAutosave(page, history.revision, initiallyStored, { enabled: !isCloud })
  const cloudSync = useCloudSync({ page, editRevision: history.revision, enabled: isCloud, initialCloud, ownerId, onCreated: onCloudCreated })
  const referencedMedia = useMemo(() => [...collectMediaIds(page)], [page])
  const media = useMediaLibrary({ owner: isCloud ? cloudOwner(page.id) : localOwner(page.id), draftId: page.id, referencedIds: referencedMedia })
  const tabsId = useId()
  const [pendingRecovery, setPendingRecovery] = useState(recovery)
  const [conflictBusy, setConflictBusy] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [tab, setTab] = useState('structure')
  // Start at the device size that matches the screen the editor is opened on.
  const [device, setDevice] = useState(() => (window.innerWidth < 760 ? 'phone' : window.innerWidth < 1180 ? 'tablet' : 'desktop'))
  const [zoomMode, setZoomMode] = useState('fit')
  const [preview, setPreview] = useState(false)
  const [drawer, setDrawer] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [toast, setToast] = useState(null)
  const [scrollRequest, setScrollRequest] = useState(null)
  // Read-only here: the editor works the same signed in or not (no login required).
  const { status: authStatus, user, refreshSession } = useAuth()
  const signedIn = authStatus === 'authenticated'

  const selected = page.sections.find((s) => s.id === selectedId) ?? null
  const resolved = useMemo(() => resolveMediaForRender(page, media.urls, { loaded: media.loaded }), [page, media.urls, media.loaded])
  const renderPage = useMemo(() => pageForRender(resolved.page), [resolved])

  // Once a brand-new local draft is first stored, put its id in the URL so a refresh reopens it.
  // (Cloud drafts do the same through onCloudCreated, with ?page=<id>.)
  const { stored } = autosave
  const savedAt = isCloud ? cloudSync.savedAt : autosave.savedAt
  useEffect(() => {
    if (isCloud || !stored) return
    navigate(`/editor/${page.templateSlug}?draft=${page.id}`, { replace: true })
  }, [isCloud, stored, navigate, page.templateSlug, page.id])

  useEffect(() => {
    if (savedAt) onDraftsChanged()
  }, [savedAt, onDraftsChanged])

  const saveView = isCloud
    ? {
        status: CLOUD_STATUS_CLASS[cloudSync.status] ?? 'error',
        text:
          CLOUD_STATUS_TEXT[cloudSync.status] +
          (cloudSync.status === 'saved' && cloudSync.savedAt
            ? ` · ${new Date(cloudSync.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : ''),
        error: cloudSync.message,
      }
    : autosave

  /** "Load newer cloud version": replaces the editor content after the user confirmed. */
  const loadNewerVersion = async () => {
    setConflictBusy('load')
    try {
      const latest = await cloudSync.fetchLatest()
      history.reset(latest.page)
      cloudSync.acceptServerVersion(latest)
      setPendingRecovery(null)
      setDialog(null)
      setToast({ message: 'Loaded the newer version from your account.' })
    } catch (error) {
      setToast({ message: error.message || 'The newer version could not be loaded.' })
    } finally {
      setConflictBusy(null)
    }
  }

  /** "Save my version as a new copy": a separate cloud draft with a new id; the original is untouched. */
  const saveVersionAsCopy = async (version) => {
    setConflictBusy('copy')
    try {
      const draft = await cloudSync.saveAsCopy(version)
      if (version && pendingRecovery) removeRecovery(ownerId, pendingRecovery.clientId)
      setDialog(null)
      onOpenCloudDraft(draft)
    } catch (error) {
      setToast({ message: error.message || 'The copy could not be saved. Your changes are still here.' })
    } finally {
      setConflictBusy(null)
    }
  }

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const select = useCallback((id, { scroll = false } = {}) => {
    setSelectedId(id)
    if (scroll) setScrollRequest({ id, at: Date.now() })
  }, [])

  const onStructure = useCallback(
    (action, id, arg) => {
      const label = SECTION_TYPES[page.sections.find((s) => s.id === id)?.type]?.label ?? 'Section'
      if (action === 'move') apply((p) => moveSection(p, id, arg))
      else if (action === 'moveTo') apply((p) => moveSectionTo(p, id, arg))
      else if (action === 'duplicate') {
        const copyId = newId('sec')
        apply((p) => duplicateSection(p, id, copyId).page)
        select(copyId, { scroll: true })
        setToast({ message: `${label} duplicated.` })
      } else if (action === 'remove') {
        apply((p) => removeSection(p, id))
        if (selectedId === id) setSelectedId(null)
        setToast({ message: `${label} removed.`, undo: true })
      }
    },
    [apply, page.sections, select, selectedId],
  )

  const onAddSection = (type) => {
    const id = newId('sec')
    apply((p) => addSection(p, type, selectedId, id).page)
    select(id, { scroll: true })
    setTab('structure')
    setToast({ message: `${SECTION_TYPES[type].label} added.` })
  }

  // Keyboard: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo, Esc leaves preview / closes drawers.
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && !isTyping(document.activeElement) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && !isTyping(document.activeElement) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      } else if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        if (preview) setPreview(false)
        else setDrawer(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, preview])

  const onTabKey = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = TABS[(index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    setTab(next.id)
    document.getElementById(`${tabsId}-tab-${next.id}`)?.focus()
  }

  const leftPanel = {
    structure: (
      <StructurePanel
        page={page}
        selectedId={selectedId}
        onSelect={(id) => {
          select(id, { scroll: true })
          if (window.matchMedia('(max-width: 1179px)').matches) setDrawer('right')
        }}
        onStructure={onStructure}
        onAdd={() => setTab('add')}
      />
    ),
    add: <AddSectionPanel page={page} onAddSection={onAddSection} />,
    theme: <ThemePanel page={page} template={template} apply={apply} />,
    media: <MediaPanel page={page} media={media} onRequestDelete={(m) => setDialog({ type: 'deleteMedia', media: m })} />,
    drafts: (
      <DraftsPanel
        drafts={drafts}
        currentId={page.id}
        stored={stored}
        storageOk={storageOk}
        templatesBySlug={templatesBySlug}
        onOpen={onOpenDraft}
        cloudDrafts={cloudDrafts}
        currentCloudId={cloudSync.cloud?.id ?? null}
        onOpenCloud={onOpenCloudDraft}
        onNew={() => setDialog({ type: 'newDraft' })}
        onRequestDelete={(d) => setDialog({ type: 'deleteDraft', draft: d })}
      />
    ),
  }[tab]

  return (
    <div className={`ed${preview ? ' is-preview' : ''}`} data-drawer={drawer ?? undefined}>
      <Toolbar
        title={page.title}
        onTitle={(v) => apply((p) => setTitle(p, v), 'title')}
        history={history}
        device={device}
        onDevice={setDevice}
        zoomMode={zoomMode}
        onZoomMode={setZoomMode}
        preview={preview}
        onPreview={() => {
          setPreview((v) => !v)
          setDrawer(null)
        }}
        autosave={saveView}
        onSave={async () => {
          if (isCloud) await cloudSync.saveNow()
          else await autosave.saveNow()
          setDialog({ type: 'save' })
        }}
        onPublish={() => setDialog({ type: 'publish' })}
        onTogglePanel={(side) => setDrawer((d) => (d === side ? null : side))}
      />

      {!storageOk && (
        <p className="ed-banner" role="alert">
          This browser is blocking storage, so your changes will be lost when you close this tab.
        </p>
      )}
      <EditorBanners
        isCloud={isCloud}
        cloudSync={cloudSync}
        missingMedia={resolved.missing.length}
        recovery={pendingRecovery}
        recoveryAppliesDirectly={Boolean(pendingRecovery && (pendingRecovery.unsavedNew || pendingRecovery.baseRevision === initialCloud?.revision))}
        busy={conflictBusy}
        onRestoreRecovery={() => {
          const restored = pendingRecovery.page
          apply(() => ({ ...restored, storage: 'cloud' }), 'recovery')
          setPendingRecovery(null)
          setToast({ message: 'Your unsaved changes are back. Saving them to your account…' })
        }}
        onRecoveryAsCopy={() => saveVersionAsCopy(pendingRecovery.page)}
        onDiscardRecovery={() => setDialog({ type: 'discardRecovery' })}
        onResolveConflict={() => setDialog({ type: 'conflict' })}
        onSaveAsCopy={() => saveVersionAsCopy()}
        onRecheckSession={() => refreshSession()}
        signedInLocalDraft={!isCloud && cloudDrafts !== null}
      />

      <div className="ed-body">
        <aside className="ed-left" aria-label="Editor tools" data-open={drawer === 'left' || undefined}>
          <div className="ed-tabs" role="tablist" aria-label="Editor panels">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                id={`${tabsId}-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`${tabsId}-panel`}
                tabIndex={tab === t.id ? 0 : -1}
                className="ed-tab"
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                <Icon name={t.icon} size={18} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${tab}`} className="ed-left__panel">
            {leftPanel}
          </div>
          <button type="button" className="ed-drawer-close" onClick={() => setDrawer(null)}>
            Close
          </button>
        </aside>

        <main className="ed-main" aria-label="Page canvas">
          <Canvas
            renderPage={renderPage}
            device={device}
            zoomMode={zoomMode}
            selectedId={selectedId}
            onSelect={(id) => select(id)}
            preview={preview}
            scrollRequest={scrollRequest}
          />
          {selected && !preview && (
            <button type="button" className="ed-editchip" onClick={() => setDrawer('right')}>
              <Icon name="edit" size={16} /> Edit {SECTION_TYPES[selected.type].label}
            </button>
          )}
        </main>

        <aside className="ed-right" aria-label="Properties" data-open={drawer === 'right' || undefined}>
          <PropertiesPanel key={selected?.id ?? 'page'} page={page} section={selected} apply={apply} media={media} onStructure={onStructure} />
          <button type="button" className="ed-drawer-close" onClick={() => setDrawer(null)}>
            Close
          </button>
        </aside>
      </div>

      {drawer && <div className="ed-scrim" onClick={() => setDrawer(null)} aria-hidden="true" />}

      {toast && (
        <div className="ed-toast" role="status">
          <span>{toast.message}</span>
          {toast.undo && (
            <button type="button" className="ed-btn ed-btn--ghost ed-btn--sm" onClick={() => { undo(); setToast(null) }}>
              Undo
            </button>
          )}
        </div>
      )}

      {dialog?.type === 'save' && (
        <SaveDraftDialog
          autosave={autosave}
          cloud={isCloud ? { status: cloudSync.status, text: saveView.text, message: cloudSync.message, missingMedia: resolved.missing.length, deviceMedia: referencedMedia.length } : null}
          signedIn={signedIn}
          user={user}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'conflict' && (
        <ConflictDialog
          busy={conflictBusy}
          onLoadNewer={() => setDialog({ type: 'confirmLoadNewer' })}
          onSaveCopy={() => saveVersionAsCopy()}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'confirmLoadNewer' && (
        <ConfirmDialog
          title="Discard your unsaved changes?"
          message="Loading the newer version from your account replaces what you see here. Your changes since the last save will be lost. To keep them, save your version as a new copy instead."
          confirmLabel={conflictBusy === 'load' ? 'Loading…' : 'Discard and load newer version'}
          onConfirm={loadNewerVersion}
          onClose={() => setDialog({ type: 'conflict' })}
        />
      )}
      {dialog?.type === 'discardRecovery' && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="The changes kept on this device for this draft will be deleted. The version saved in your account stays as it is."
          confirmLabel="Discard changes"
          onConfirm={() => {
            removeRecovery(ownerId, pendingRecovery.clientId)
            setPendingRecovery(null)
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'publish' && (
        <PublishDialog options={publishing.getPublishingOptions(page)} category={page.templateCategory} signedIn={signedIn} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'newDraft' && (
        <ConfirmDialog
          title="Start a fresh draft?"
          message={`This opens a new, unedited copy of “${template.name}”. Your current draft stays on this device and you can reopen it from Drafts.`}
          confirmLabel="Start fresh"
          onConfirm={() => { setDialog(null); onNewDraft() }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'deleteDraft' && (
        <ConfirmDialog
          title="Delete this draft?"
          message={`“${dialog.draft.title || 'Untitled page'}” and its uploaded images will be removed from this device. This can’t be undone.`}
          confirmLabel="Delete draft"
          onConfirm={() => { const d = dialog.draft; setDialog(null); onDeleteDraft(d) }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'deleteMedia' && (
        <ConfirmDialog
          title="Delete this image?"
          message={`“${dialog.media.name}” will be removed from this draft’s media library. Undo can’t bring it back once deleted.`}
          confirmLabel="Delete image"
          onConfirm={() => { const m = dialog.media; setDialog(null); media.remove(m.id) }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
