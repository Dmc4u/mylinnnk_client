import Icon from './icons.jsx'

const plural = (n, one, many) => (n === 1 ? one : many)

/**
 * Messages under the toolbar about where the draft is saved:
 * recovered changes, cloud save problems (offline, expired session, other
 * account, conflict, deleted, error) and images that live on another device.
 * Every message says what happened to the user's changes.
 */
export default function EditorBanners({
  isCloud,
  cloudSync,
  missingMedia,
  recovery,
  recoveryAppliesDirectly,
  busy,
  onRestoreRecovery,
  onRecoveryAsCopy,
  onDiscardRecovery,
  onResolveConflict,
  onSaveAsCopy,
  onRecheckSession,
  signedInLocalDraft,
  mediaFailures = [],
  onRetryUploads,
}) {
  const banners = []
  const status = cloudSync.status

  if (recovery) {
    const when = recovery.savedAt ? new Date(recovery.savedAt).toLocaleString() : 'earlier'
    banners.push(
      <div key="recovery" className="ed-banner ed-banner--info" role="status">
        <Icon name="info" size={18} />
        <p>
          {recovery.unsavedNew
            ? `These changes from ${when} were never saved to your account. They’re kept on this device.`
            : recoveryAppliesDirectly
              ? `You have unsaved changes from ${when} on this device that didn’t reach your account.`
              : `You have unsaved changes from ${when}, but this draft has been updated in your account since. Restoring them would overwrite the newer version, so you can keep them as a separate copy.`}
        </p>
        <div className="ed-banner__actions">
          {recoveryAppliesDirectly ? (
            <button type="button" className="ed-btn ed-btn--sm ed-btn--primary" onClick={onRestoreRecovery}>
              {recovery.unsavedNew ? 'Save to my account' : 'Restore my changes'}
            </button>
          ) : (
            <button type="button" className="ed-btn ed-btn--sm ed-btn--primary" onClick={onRecoveryAsCopy} disabled={busy === 'copy'}>
              {busy === 'copy' ? 'Saving copy…' : 'Save them as a new copy'}
            </button>
          )}
          <button type="button" className="ed-btn ed-btn--sm ed-btn--ghost" onClick={onDiscardRecovery}>
            Discard
          </button>
        </div>
      </div>,
    )
  }

  if (isCloud) {
    if (status === 'offline') {
      banners.push(
        <div key="offline" className="ed-banner ed-banner--warn" role="status">
          <Icon name="info" size={18} />
          <p>You’re offline or MyLinnnk can’t be reached. Your changes are kept on this device and will be saved to your account when the connection is back.</p>
          <div className="ed-banner__actions">
            <button type="button" className="ed-btn ed-btn--sm" onClick={cloudSync.retry}>Retry now</button>
          </div>
        </div>,
      )
    } else if (status === 'expired') {
      banners.push(
        <div key="expired" className="ed-banner ed-banner--warn" role="alert">
          <Icon name="lock" size={18} />
          <p>Your session has expired, so changes aren’t being saved to your account. They’re kept on this device. Log in again to continue saving.</p>
          <div className="ed-banner__actions">
            <a className="ed-btn ed-btn--sm ed-btn--primary" href="/login" target="_blank" rel="noopener">Log in (new tab)</a>
            <button type="button" className="ed-btn ed-btn--sm" onClick={onRecheckSession}>I’ve logged in</button>
          </div>
        </div>,
      )
    } else if (status === 'wrong-account') {
      banners.push(
        <div key="account" className="ed-banner ed-banner--warn" role="alert">
          <Icon name="lock" size={18} />
          <p>You’re now signed in to a different account than the one this draft belongs to. Changes are kept on this device and are not saved to either account. Sign back in to the original account to save them.</p>
        </div>,
      )
    } else if (status === 'conflict') {
      banners.push(
        <div key="conflict" className="ed-banner ed-banner--warn" role="alert">
          <Icon name="info" size={18} />
          <p>This draft was changed somewhere else (another tab or device). Your changes here are kept on this device and have not overwritten anything.</p>
          <div className="ed-banner__actions">
            <button type="button" className="ed-btn ed-btn--sm ed-btn--primary" onClick={onResolveConflict}>Resolve…</button>
          </div>
        </div>,
      )
    } else if (status === 'deleted') {
      banners.push(
        <div key="deleted" className="ed-banner ed-banner--warn" role="alert">
          <Icon name="info" size={18} />
          <p>This draft was deleted from your account. Your changes here are kept on this device; you can save them as a new draft.</p>
          <div className="ed-banner__actions">
            <button type="button" className="ed-btn ed-btn--sm ed-btn--primary" onClick={onSaveAsCopy} disabled={busy === 'copy'}>
              {busy === 'copy' ? 'Saving…' : 'Save as a new draft'}
            </button>
          </div>
        </div>,
      )
    } else if (status === 'error') {
      banners.push(
        <div key="error" className="ed-banner ed-banner--warn" role="alert">
          <Icon name="info" size={18} />
          <p>{cloudSync.message ?? 'Your changes could not be saved to your account.'} They’re kept on this device.</p>
          <div className="ed-banner__actions">
            <button type="button" className="ed-btn ed-btn--sm" onClick={cloudSync.retry}>Try again</button>
          </div>
        </div>,
      )
    }
  }

  if (mediaFailures.length > 0) {
    const n = mediaFailures.length
    banners.push(
      <div key="upload-failed" className="ed-banner ed-banner--warn" role="alert">
        <Icon name="image" size={18} />
        <p>
          {n} {plural(n, 'image', 'images')} couldn’t be uploaded to your account ({String(mediaFailures[0].message ?? '').replace(/[.\s]+$/, '')}). {plural(n, 'It stays', 'They stay')} on this
          device and in this draft; uploading is retried automatically when possible.
        </p>
        <div className="ed-banner__actions">
          <button type="button" className="ed-btn ed-btn--sm" onClick={onRetryUploads}>Retry uploads</button>
        </div>
      </div>,
    )
  }

  if (missingMedia > 0) {
    banners.push(
      <div key="media" className="ed-banner ed-banner--info" role="status">
        <Icon name="image" size={18} />
        <p>
          {missingMedia} uploaded {plural(missingMedia, 'image is', 'images are')} stored only on the device where{' '}
          {plural(missingMedia, 'it was', 'they were')} added and {plural(missingMedia, 'hasn’t', 'haven’t')} reached your account yet. Text, layout and
          design are saved to your account; here {plural(missingMedia, 'it shows', 'they show')} the original template photo or a placeholder until that
          device uploads {plural(missingMedia, 'it', 'them')}. Nothing is removed unless you replace {plural(missingMedia, 'it', 'them')}.
        </p>
      </div>,
    )
  }

  if (signedInLocalDraft) {
    banners.push(
      <div key="local" className="ed-banner ed-banner--info" role="status">
        <Icon name="folder" size={18} />
        <p>
          This draft is saved on this device only. To keep it in your account, import it from <a href="/account">your account page</a>.
        </p>
      </div>,
    )
  }

  return banners.length ? <div className="ed-banners">{banners}</div> : null
}
