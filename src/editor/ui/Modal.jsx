import { useEffect, useId, useRef } from 'react'
import Icon from './icons.jsx'

/**
 * Accessible modal built on the native <dialog> element: focus is trapped,
 * Escape closes it and focus returns to the opener automatically.
 */
export default function Modal({ title, onClose, children, footer, size = 'md' }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.open && dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={`ed-modal ed-modal--${size}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="ed-modal__box">
        <header className="ed-modal__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ed-iconbtn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="ed-modal__body">{children}</div>
        {footer && <footer className="ed-modal__foot">{footer}</footer>}
      </div>
    </dialog>
  )
}
