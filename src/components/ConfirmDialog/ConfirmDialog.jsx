import { useEffect, useId, useRef } from 'react'
import './ConfirmDialog.css'

/**
 * Accessible confirmation dialog for site pages, built on the native <dialog>
 * element (focus is trapped, Escape cancels, focus returns to the opener).
 * tone: 'danger' for destructive actions, 'primary' otherwise.
 */
export default function ConfirmDialog({ title, children, confirmLabel, cancelLabel = 'Cancel', tone = 'primary', busy = false, onConfirm, onCancel }) {
  const ref = useRef(null)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.open && dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <h2 id={titleId} className="confirm-dialog__title">
        {title}
      </h2>
      <div id={bodyId} className="confirm-dialog__body">
        {children}
      </div>
      <div className="confirm-dialog__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button type="button" className={`btn btn--sm confirm-dialog__confirm confirm-dialog__confirm--${tone}`} onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}>
          {busy && <span className="btn__spinner" aria-hidden="true" />}
          <span className="btn__label">{confirmLabel}</span>
        </button>
      </div>
    </dialog>
  )
}
