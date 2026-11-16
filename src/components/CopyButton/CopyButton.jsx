import { useEffect, useState } from 'react'
import './CopyButton.css'

/** Copies `value` and says so for a moment (politely, for screen readers); falls back to a hidden text field. */
export default function CopyButton({ value, label, className = 'order-btn order-btn--small' }) {
  const [copied, setCopied] = useState(null) // null | 'ok' | 'failed'
  useEffect(() => {
    if (!copied) return undefined
    const t = setTimeout(() => setCopied(null), 2500)
    return () => clearTimeout(t)
  }, [copied])
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value)
      else {
        const area = document.createElement('textarea')
        area.value = value
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.append(area)
        area.select()
        const ok = document.execCommand?.('copy')
        area.remove()
        if (!ok) throw new Error('copy failed')
      }
      setCopied('ok')
    } catch {
      setCopied('failed')
    }
  }
  return (
    <span className="copy-button">
      {/* The button keeps its name for assistive technology; the visible label confirms the copy, and the
          status below announces it. */}
      <button type="button" className={`${className}${copied === 'ok' ? ' is-copied' : ''}`} onClick={copy} aria-label={label}>
        <span aria-hidden="true">{copied === 'ok' ? 'Copied ✓' : label}</span>
      </button>
      <span className="copy-button__status" role="status" aria-live="polite">
        {copied === 'ok' ? 'Copied' : copied === 'failed' ? 'Couldn’t copy: please copy it by hand' : ''}
      </span>
    </span>
  )
}
