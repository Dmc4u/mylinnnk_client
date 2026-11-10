import { useEffect, useRef } from 'react'
import TemplateRender from '../TemplateRender/TemplateRender.jsx'
import './TemplateThumb.css'

/**
 * Shows the top of a template page rendered at a desktop "design size" and
 * scaled down to fit its container. Scaling is applied through a CSS variable
 * from a ResizeObserver, so resizing never re-renders React.
 * The miniature page is inert: it can't be focused or clicked into.
 */
export default function TemplateThumb({ template, designWidth = 1280, designHeight = 860, className = '' }) {
  const frameRef = useRef(null)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return undefined
    const observer = new ResizeObserver(([entry]) => {
      frame.style.setProperty('--thumb-scale', String(entry.contentRect.width / designWidth))
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [designWidth])

  return (
    <div
      ref={frameRef}
      className={`tpl-thumb ${className}`.trim()}
      style={{ aspectRatio: `${designWidth} / ${designHeight}` }}
    >
      <div className="tpl-thumb__canvas" style={{ width: designWidth, height: designHeight }} inert aria-hidden="true">
        {/* Only the top of the page is visible, so skip sections far below the fold */}
        <TemplateRender template={template} maxSections={3} />
      </div>
    </div>
  )
}
