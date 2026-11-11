import { useId } from 'react'
import { Link } from 'react-router'
import BrandMark from '../../components/Brand/BrandMark.jsx'
import { DEVICES } from '../config/devices.js'
import Icon from './icons.jsx'

function SaveStatus({ autosave }) {
  const { status, savedAt, error } = autosave
  // Cloud drafts pass their own wording (Saving… / Saved to your account / Offline …).
  const text = autosave.text ??
    (status === 'error' ? 'Not saved' :
    status === 'saving' ? 'Unsaved changes…' :
    status === 'saved' ? `Saved on this device${savedAt ? ` · ${new Date(savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}` :
    'Not saved yet')
  return (
    <span className={`ed-status ed-status--${status}`} role="status" title={error ?? text}>
      <span className="ed-status__dot" aria-hidden="true" />
      <span className="ed-status__text">{text}</span>
    </span>
  )
}

/**
 * Image upload state for cloud drafts, separate from the page's own save state:
 * "Saved to your account" is about the page; this is about its images.
 */
function MediaStatus({ media }) {
  if (!media) return null
  const { total, synced, uploading, failed, waiting } = media
  let status = 'saving'
  let text = 'Checking images…'
  if (failed) {
    status = 'error'
    text = `Image upload failed (${failed})`
  } else if (uploading) {
    text = `Images uploading… (${uploading})`
  } else if (waiting) {
    status = 'new'
    text = `${waiting} image${waiting === 1 ? '' : 's'} not uploaded yet`
  } else if (synced === total) {
    status = 'saved'
    text = 'Images synced'
  }
  return (
    <span className={`ed-status ed-status--${status} ed-status--media`} aria-live="polite" data-testid="media-status" title={text}>
      <span className="ed-status__dot" aria-hidden="true" />
      <span className="ed-status__text">{text}</span>
    </span>
  )
}

export default function Toolbar({ title, onTitle, history, device, onDevice, zoomMode, onZoomMode, preview, onPreview, autosave, mediaStatus, onSave, onPublish, onTogglePanel }) {
  const titleId = useId()
  return (
    <header className="ed-toolbar">
      <div className="ed-toolbar__start">
        <Link to="/" className="ed-toolbar__brand" aria-label="MyLinnnk home">
          <BrandMark size={30} />
        </Link>
        <Link to="/templates" className="ed-btn ed-btn--ghost ed-btn--sm ed-toolbar__back">
          <Icon name="back" size={16} /> <span>Templates</span>
        </Link>
        <label htmlFor={titleId} className="sr-only">Page title</label>
        <input id={titleId} className="ed-toolbar__title" value={title} onChange={(e) => onTitle(e.target.value)} maxLength={120} />
        <SaveStatus autosave={autosave} />
        <MediaStatus media={mediaStatus} />
      </div>

      <div className="ed-toolbar__center">
        <div className="ed-segment" role="group" aria-label="History">
          <button type="button" className="ed-iconbtn" onClick={history.undo} disabled={!history.canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
            <Icon name="undo" />
          </button>
          <button type="button" className="ed-iconbtn" onClick={history.redo} disabled={!history.canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
            <Icon name="redo" />
          </button>
        </div>
        <div className="ed-segment" role="group" aria-label="Preview size">
          {Object.entries(DEVICES).map(([key, d]) => (
            <button key={key} type="button" className="ed-iconbtn" aria-pressed={device === key} onClick={() => onDevice(key)} aria-label={`${d.label} view`} title={`${d.label} (${d.width}px)`}>
              <Icon name={d.icon} />
            </button>
          ))}
          <button type="button" className="ed-iconbtn ed-toolbar__zoom" aria-pressed={zoomMode === 'fit'} onClick={() => onZoomMode(zoomMode === 'fit' ? 'actual' : 'fit')} aria-label="Fit page to width" title="Fit to width">
            <Icon name="fit" />
          </button>
        </div>
      </div>

      <div className="ed-toolbar__end">
        <button type="button" className="ed-btn ed-btn--ghost ed-btn--sm ed-btn--icon-on-phone ed-toolbar__panels" onClick={() => onTogglePanel('left')}>
          <Icon name="layers" size={16} /> <span>Sections</span>
        </button>
        <button type="button" className="ed-btn ed-btn--ghost ed-btn--sm ed-btn--icon-on-phone" aria-pressed={preview} onClick={onPreview}>
          <Icon name="eye" size={16} /> <span>{preview ? 'Exit preview' : 'Preview'}</span>
        </button>
        <button type="button" className="ed-btn ed-btn--ghost ed-btn--sm" onClick={onSave}>
          <span>Save draft</span>
        </button>
        <button type="button" className="ed-btn ed-btn--primary ed-btn--sm" onClick={onPublish}>
          <span>Publish</span>
        </button>
      </div>
    </header>
  )
}
