import { useEffect, useRef, useState } from 'react'
import TemplateRender from '../../components/TemplateRender/TemplateRender.jsx'
import { DEVICES } from '../config/devices.js'

/**
 * The live page. Renders the draft with the real template renderer at the
 * chosen device width, scaled to fit when needed. Clicks select sections and
 * never navigate.
 */
export default function Canvas({ renderPage, device, zoomMode, selectedId, onSelect, preview, scrollRequest }) {
  const scrollerRef = useRef(null)
  const [available, setAvailable] = useState(1200)
  const width = DEVICES[device].width
  const zoom = zoomMode === 'fit' ? Math.min(1, Math.max(0.25, (available - 32) / width)) : 1

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Bring a section into view when it is selected from the sidebar.
  useEffect(() => {
    if (!scrollRequest) return
    const target = scrollerRef.current?.querySelector(`[data-section="${CSS.escape(scrollRequest.id)}"]`)
    target?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [scrollRequest])

  return (
    <div className={`ed-canvas${preview ? ' is-preview' : ''}`} ref={scrollerRef}>
      <div
        className={`ed-frame ed-frame--${device}`}
        style={{ width, zoom }}
        onClickCapture={(e) => {
          e.preventDefault()
          if (preview) return
          const section = e.target.closest('[data-section]')
          if (section) onSelect(section.dataset.section)
        }}
      >
        <div className="ed-frame__chrome" aria-hidden="true">
          <span className="ed-frame__dots" />
          <span className="ed-frame__url">Draft preview · not published</span>
        </div>
        <div className="ed-frame__page" aria-label="Page preview" role="region">
          <TemplateRender template={renderPage} selectedSectionId={preview ? null : selectedId} motion={preview ? 'play' : 'static'} />
        </div>
      </div>
    </div>
  )
}
