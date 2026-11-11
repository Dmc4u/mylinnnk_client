import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import { ActionButton, FormAlert } from '../../components/Form/Form.jsx'
import { errorMessage } from '../../auth/messages.js'
import { useAuth } from '../../auth/useAuth.js'
import { getTemplateBySlug } from '../../data/templates.js'
import { cloudDraftApi } from '../../editor/services/cloudDrafts.js'
import { findImportCandidates, importLocalDraft } from '../../editor/services/importService.js'
import { isImportPostponed, postponeImport } from '../../editor/storage/importMarks.js'
import { cloudOwner, releaseOwnerMedia } from '../../editor/storage/mediaStore.js'
import { listRecoveries } from '../../editor/storage/recoveryStore.js'

const templateName = (slug) => getTemplateBySlug(slug)?.name ?? slug
const when = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const images = (n) => `${n} uploaded image${n === 1 ? '' : 's'}`

/**
 * Account page drafts (a minimal list, not the full dashboard):
 * - cloud drafts: open or delete (with confirmation);
 * - unsaved changes kept on this device for cloud drafts;
 * - guest drafts on this device that can be imported (explicitly confirmed).
 */
export default function AccountDrafts() {
  return (
    <>
      <CloudDrafts />
      <UnsavedChanges />
      <ImportGuestDrafts />
    </>
  )
}

function CloudDrafts() {
  const { withCsrf } = useAuth()
  const [state, setState] = useState({ phase: 'loading', drafts: [] })
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    try {
      setState({ phase: 'ready', drafts: await cloudDraftApi.list() })
    } catch (error) {
      setState((prev) => ({ ...prev, phase: 'error', message: errorMessage(error) }))
    }
  }, [])

  useEffect(() => {
    queueMicrotask(load)
  }, [load])

  const remove = async () => {
    const draft = confirm
    setBusy(true)
    try {
      await withCsrf((csrf) => cloudDraftApi.remove(csrf, draft.id, draft.revision))
      // This deleted draft no longer needs its images here; ones other drafts use are kept.
      await releaseOwnerMedia(cloudOwner(draft.clientId)).catch(() => {})
      setNotice({ tone: 'success', text: `“${draft.title || 'Untitled page'}” was deleted from your account.` })
    } catch (error) {
      setNotice({
        tone: 'error',
        text:
          error?.code === 'REVISION_CONFLICT'
            ? 'That draft was changed after this list was loaded, so it wasn’t deleted. The list is up to date now; check it and try again.'
            : errorMessage(error),
      })
    } finally {
      setBusy(false)
      setConfirm(null)
      await load()
    }
  }

  return (
    <section className="account-section" aria-labelledby="cloud-drafts-heading">
      <h2 id="cloud-drafts-heading">Your pages</h2>
      <p>Drafts saved to your account. Open them on any device after logging in.</p>
      {notice && <FormAlert tone={notice.tone}>{notice.text}</FormAlert>}
      {state.phase === 'loading' && <p className="account-drafts__empty">Loading your drafts…</p>}
      {state.phase === 'error' && (
        <FormAlert tone="warn" title="Your drafts couldn’t be loaded.">
          <p>{state.message}</p>
          <button type="button" className="link-button" onClick={load}>
            Try again
          </button>
        </FormAlert>
      )}
      {state.phase === 'ready' && state.drafts.length === 0 && (
        <p className="account-drafts__empty">
          No drafts in your account yet. <Link to="/templates">Choose a template</Link> and start editing: pages you edit while logged in are saved here.
        </p>
      )}
      {state.drafts.length > 0 && (
        <ul className="account-drafts" aria-label="Drafts in your account">
          {state.drafts.map((d) => (
            <li key={d.id} className="account-drafts__item">
              <div className="account-drafts__text">
                <p className="account-drafts__title">{d.title || 'Untitled page'}</p>
                <p className="account-drafts__meta">
                  {templateName(d.templateSlug)} · updated {when(d.updatedAt)}
                </p>
                {d.pendingMediaCount > 0 && (
                  <p className="account-drafts__media">
                    {images(d.pendingMediaCount)} not uploaded yet: {d.pendingMediaCount === 1 ? 'it uploads' : 'they upload'} from the device where{' '}
                    {d.pendingMediaCount === 1 ? 'it was' : 'they were'} added.
                  </p>
                )}
              </div>
              <div className="account-drafts__actions">
                <Link className="btn btn--ghost btn--sm" to={`/editor/${d.templateSlug}?page=${d.id}`} aria-label={`Open ${d.title || 'Untitled page'}`}>
                  Open
                </Link>
                <button type="button" className="btn btn--ghost btn--sm account-drafts__delete" onClick={() => setConfirm(d)} aria-label={`Delete ${d.title || 'Untitled page'}`}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {confirm && (
        <ConfirmDialog title="Delete this draft?" confirmLabel={busy ? 'Deleting…' : 'Delete draft'} tone="danger" busy={busy} onConfirm={remove} onCancel={() => setConfirm(null)}>
          <p>
            “{confirm.title || 'Untitled page'}” will be removed from your account. Deleted drafts are kept for 30 days and then erased
            permanently; they can’t be restored from MyLinnnk yet.
          </p>
          <p>Drafts saved on this device are not affected, and images other drafts use are kept.</p>
        </ConfirmDialog>
      )}
    </section>
  )
}

function UnsavedChanges() {
  const { user } = useAuth()
  const [entries] = useState(() => listRecoveries(user.id))
  if (!entries.length) return null
  return (
    <section className="account-section" aria-labelledby="unsaved-heading">
      <h2 id="unsaved-heading">Unsaved changes on this device</h2>
      <p>These edits didn’t reach your account yet (for example, you were offline or your session expired). Open a draft to save or discard them.</p>
      <ul className="account-drafts">
        {entries.map((entry) => (
          <li key={entry.clientId} className="account-drafts__item">
            <div className="account-drafts__text">
              <p className="account-drafts__title">{entry.title || 'Untitled page'}</p>
              <p className="account-drafts__meta">
                {templateName(entry.templateSlug)} · changed {when(entry.savedAt)}
              </p>
            </div>
            <div className="account-drafts__actions">
              <Link
                className="btn btn--ghost btn--sm"
                to={entry.serverId ? `/editor/${entry.templateSlug}?page=${entry.serverId}` : `/editor/${entry.templateSlug}?recover=${entry.clientId}`}
              >
                Open
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

const STATUS_TEXT = {
  importing: 'Importing…',
  imported: 'In your account',
  conflict: 'Not imported',
  deleted: 'Not imported',
  failed: 'Not imported',
}

function ImportGuestDrafts() {
  const { user, withCsrf } = useAuth()
  const [candidates, setCandidates] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [results, setResults] = useState({})
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [postponed, setPostponed] = useState(() => isImportPostponed(user.id))

  const refresh = useCallback(async () => {
    const list = await findImportCandidates(user.id)
    setCandidates(list)
    setSelected(new Set(list.filter((c) => c.valid && !c.imported).map((c) => c.id)))
  }, [user.id])

  useEffect(() => {
    queueMicrotask(refresh)
  }, [refresh])

  if (!candidates || candidates.length === 0) return null
  const pending = candidates.filter((c) => c.valid && !c.imported && results[c.id]?.status !== 'imported')
  const alreadyImported = candidates.filter((c) => c.imported || results[c.id]?.status === 'imported')
  const damaged = candidates.filter((c) => !c.valid)

  if (postponed) {
    return (
      <section className="account-section" aria-labelledby="import-heading">
        <h2 id="import-heading">Drafts on this device</h2>
        <p>
          {pending.length > 0 ? `${pending.length} draft${pending.length === 1 ? '' : 's'} on this device can be imported into your account.` : 'Drafts made on this device as a guest.'}{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              postponeImport(user.id, false)
              setPostponed(false)
            }}
          >
            Show them
          </button>
        </p>
      </section>
    )
  }

  const toImport = candidates.filter((c) => selected.has(c.id) && pending.includes(c))
  const mediaToStay = toImport.reduce((n, c) => n + c.mediaCount, 0)

  const run = async (drafts, { asCopy = false } = {}) => {
    setConfirming(false)
    setRunning(true)
    for (const draft of drafts) {
      setResults((r) => ({ ...r, [draft.id]: { status: 'importing' } }))
      const result = await importLocalDraft({ withCsrf, userId: user.id, draftId: draft.id, asCopy })
      setResults((r) => ({ ...r, [draft.id]: result }))
    }
    setRunning(false)
  }

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <section className="account-section" aria-labelledby="import-heading">
      <h2 id="import-heading">Drafts on this device</h2>
      <p>
        You made {candidates.length === 1 ? 'this draft' : 'these drafts'} as a guest in this browser. Import them to keep them in your account.
        Importing copies them; the drafts on this device stay as they are.
      </p>
      {alreadyImported.length > 0 && (
        <p className="account-drafts__meta">
          {alreadyImported.length} of them {alreadyImported.length === 1 ? 'is' : 'are'} already in your account.
        </p>
      )}
      <ul className="account-drafts" aria-label="Drafts on this device">
        {candidates.map((c) => {
          const result = results[c.id]
          const imported = c.imported || result?.status === 'imported'
          const importable = c.valid && !imported
          return (
            <li key={c.id} className="account-drafts__item">
              <label className="account-drafts__pick">
                <input type="checkbox" checked={importable && selected.has(c.id)} disabled={!importable || running} onChange={() => toggle(c.id)} />
                <span className="account-drafts__text">
                  <span className="account-drafts__title">{c.title}</span>
                  <span className="account-drafts__meta">
                    {templateName(c.templateSlug)} · edited {when(c.updatedAt)}
                  </span>
                  {c.mediaCount > 0 && <span className="account-drafts__media">{images(c.mediaCount)} will be uploaded to your account after importing.</span>}
                  {!c.valid && <span className="account-drafts__media">This draft is damaged and can’t be imported.</span>}
                </span>
              </label>
              <div className="account-drafts__status" aria-live="polite">
                {imported && <span className="account-badge account-badge--ok">In your account</span>}
                {!imported && result && result.status !== 'imported' && (
                  <span className={`account-badge ${result.status === 'importing' ? 'account-badge--pending' : 'account-badge--error'}`}>{STATUS_TEXT[result.status]}</span>
                )}
              </div>
              {result && ['conflict', 'deleted', 'failed'].includes(result.status) && (
                <div className="account-drafts__problem">
                  <p>{result.message}</p>
                  {result.status === 'failed' && result.retryable && (
                    <button type="button" className="link-button" disabled={running} onClick={() => run([c])}>
                      Retry
                    </button>
                  )}
                  {(result.status === 'conflict' || result.status === 'deleted') && (
                    <button type="button" className="link-button" disabled={running} onClick={() => run([c], { asCopy: true })}>
                      Import as a new copy
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {damaged.length === candidates.length ? null : (
        <div className="auth-actions auth-actions--start">
          <ActionButton variant="primary" size="sm" busy={running} busyLabel="Importing…" disabled={toImport.length === 0} onClick={() => setConfirming(true)}>
            {toImport.length > 1 ? `Import ${toImport.length} drafts` : 'Import selected draft'}
          </ActionButton>
          <ActionButton
            size="sm"
            disabled={running}
            onClick={() => {
              postponeImport(user.id)
              setPostponed(true)
            }}
          >
            Not now
          </ActionButton>
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title={toImport.length === 1 ? 'Import this draft into your account?' : `Import ${toImport.length} drafts into your account?`}
          confirmLabel="Import"
          onConfirm={() => run(toImport)}
          onCancel={() => setConfirming(false)}
        >
          <p>A copy of each draft is saved to your account ({user.email}). The drafts on this device are not changed or deleted.</p>
          <ul>
            {toImport.map((c) => (
              <li key={c.id}>
                {c.title} <span className="account-drafts__meta">({templateName(c.templateSlug)})</span>
              </li>
            ))}
          </ul>
          {mediaToStay > 0 && (
            <p>
              <b>{images(mediaToStay)}</b> will then upload to your account in the background, so they also appear on your other devices. They stay
              on this device too.
            </p>
          )}
        </ConfirmDialog>
      )}
    </section>
  )
}
