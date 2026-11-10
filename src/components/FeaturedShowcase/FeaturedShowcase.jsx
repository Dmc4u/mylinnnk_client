import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import Button from '../Button/Button.jsx'
import TemplateThumb from '../TemplateThumb/TemplateThumb.jsx'
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion.js'
import usePageVisible from '../../hooks/usePageVisible.js'
import { CATEGORY_LABELS } from '../../data/templates.js'
import { getUseTemplateHref, templatePreviewPath } from '../../utils/navigation.js'
import './FeaturedShowcase.css'

const AUTOPLAY_MS = 6000
const DRAG_THRESHOLD = 6 // px before a press becomes a drag
const SPACING_RATIO = 0.52 // must match --spacing-ratio in CSS
const MAX_VISIBLE = 3 // slides shown on each side of the active one

/** Shortest signed distance from `active` to `index` on a ring of `count`. */
function ringOffset(index, active, count) {
  let offset = (((index - active) % count) + count) % count
  if (offset > count / 2) offset -= count
  return offset
}

/**
 * Featured Templates — a perspective carousel. One large page in the centre,
 * neighbours fanned out behind it. Supports buttons, dots, drag/swipe,
 * keyboard and (pausable) autoplay; respects prefers-reduced-motion.
 */
export default function FeaturedShowcase({ templates }) {
  const count = templates.length
  const navigate = useNavigate()
  const reducedMotion = usePrefersReducedMotion()
  const pageVisible = usePageVisible()
  const titleId = useId()

  const [active, setActive] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dragging, setDragging] = useState(false)

  const stageRef = useRef(null)
  const drag = useRef(null)

  const step = useCallback((delta) => setActive((i) => (((i + delta) % count) + count) % count), [count])
  const goTo = useCallback((index) => setActive(((index % count) + count) % count), [count])

  const rotating = autoplay && !reducedMotion && !hovered && !focused && !dragging && pageVisible

  // Autoplay: restart the timer whenever the slide changes, so manual
  // navigation always gets a full interval before the next auto-advance.
  useEffect(() => {
    if (!rotating) return undefined
    const timer = setTimeout(() => step(1), AUTOPLAY_MS)
    return () => clearTimeout(timer)
  }, [rotating, active, step])

  const current = templates[active]

  /* ---------- Drag / swipe ---------- */
  const setDragOffset = (value) => stageRef.current?.style.setProperty('--drag', String(value))

  const spacingPx = () => {
    const card = stageRef.current?.querySelector('.showcase__slide')
    return (card?.offsetWidth ?? 600) * SPACING_RATIO
  }

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    const slide = event.target.closest('[data-index]')
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      dx: 0,
      moved: false,
      index: slide ? Number(slide.dataset.index) : null,
      spacing: spacingPx(),
    }
  }

  const onPointerMove = (event) => {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return
    d.dx = event.clientX - d.startX
    if (!d.moved && Math.abs(d.dx) > DRAG_THRESHOLD) {
      d.moved = true
      setDragging(true)
      stageRef.current?.setPointerCapture(event.pointerId)
    }
    if (d.moved) setDragOffset(d.dx / d.spacing)
  }

  const endDrag = (event, cancelled = false) => {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return
    drag.current = null
    setDragOffset(0)

    if (d.moved) {
      setDragging(false)
      if (cancelled) return
      let steps = Math.round(-d.dx / d.spacing)
      if (steps === 0 && Math.abs(d.dx) > 40) steps = d.dx < 0 ? 1 : -1
      step(Math.max(-MAX_VISIBLE, Math.min(MAX_VISIBLE, steps)))
      return
    }

    // A plain click: side slides come to the front, the front slide opens.
    if (!cancelled && d.index !== null) {
      if (d.index === active) navigate(templatePreviewPath(templates[d.index].slug))
      else goTo(d.index)
    }
  }

  /* ---------- Keyboard ---------- */
  const onKeyDown = (event) => {
    const actions = {
      ArrowLeft: () => step(-1),
      ArrowRight: () => step(1),
      Home: () => goTo(0),
      End: () => goTo(count - 1),
      Enter: () => navigate(templatePreviewPath(current.slug)),
    }
    const action = actions[event.key]
    if (action && event.target === event.currentTarget) {
      event.preventDefault()
      action()
    }
  }

  return (
    <section
      className="showcase"
      aria-roledescription="carousel"
      aria-labelledby={titleId}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      // Only keyboard focus pauses autoplay; a mouse click shouldn't stop it for good.
      onFocus={(e) => e.target.matches(':focus-visible') && setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false)
      }}
    >
      <div className="showcase__backdrop" aria-hidden="true">
        <span className="showcase__ring" />
        <span className="showcase__ring" />
        <span className="showcase__ring" />
      </div>

      <div className="container showcase__head">
        <p className="showcase__eyebrow">Featured templates</p>
        <h2 id={titleId} className="showcase__title">
          Hand-picked pages for life’s <span className="text-gradient">biggest moments</span>
        </h2>
      </div>

      <div
        ref={stageRef}
        className={`showcase__stage ${dragging ? 'is-dragging' : ''}`}
        tabIndex={0}
        aria-label="Featured templates. Use the left and right arrow keys to browse, Enter to preview."
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e)}
        onPointerCancel={(e) => endDrag(e, true)}
        // Touch pointers are implicitly captured by the slide that was touched;
        // moving capture to the stage fires lostpointercapture on that slide,
        // which must not cancel the drag. Only the stage losing capture counts.
        onLostPointerCapture={(e) => e.target === e.currentTarget && endDrag(e, true)}
      >
        {templates.map((template, index) => {
          const offset = ringOffset(index, active, count)
          const distance = Math.abs(offset)
          const isActive = offset === 0
          return (
            <div
              key={template.slug}
              data-index={index}
              className={`showcase__slide ${isActive ? 'is-active' : ''} ${distance > MAX_VISIBLE ? 'is-hidden' : ''}`}
              style={{ '--offset': offset, zIndex: 20 - distance }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}: ${template.name}`}
              aria-hidden={!isActive}
            >
              <div className="showcase__window">
                <div className="showcase__chrome" aria-hidden="true">
                  <span className="showcase__dots" />
                  <span className="showcase__url">mylinnnk.com/{template.slug}</span>
                </div>
                <TemplateThumb template={template} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="container showcase__panel">
        <div className="showcase__nav">
          <button type="button" className="showcase__arrow" onClick={() => step(-1)} aria-label="Previous template">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="showcase__info" key={current.slug}>
            <p className="showcase__category">{CATEGORY_LABELS[current.category]}</p>
            <h3 className="showcase__name">{current.name}</h3>
            <p className="showcase__desc">{current.description}</p>
          </div>

          <button type="button" className="showcase__arrow" onClick={() => step(1)} aria-label="Next template">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="showcase__actions">
          <Button to={templatePreviewPath(current.slug)}>Preview</Button>
          <Button to={getUseTemplateHref(current.slug)} variant="ghost">
            Use This Template
          </Button>
        </div>

        <div className="showcase__controls">
          <div className="showcase__pips" role="group" aria-label="Choose a featured template">
            {templates.map((template, index) => (
              <button
                key={template.slug}
                type="button"
                className={`showcase__pip ${index === active ? 'is-active' : ''} ${rotating ? 'is-running' : ''}`}
                style={{ '--autoplay-ms': `${AUTOPLAY_MS}ms` }}
                aria-label={`Show ${template.name}`}
                aria-current={index === active ? 'true' : undefined}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
          {!reducedMotion && (
            <button
              type="button"
              className="showcase__toggle"
              onClick={() => setAutoplay((on) => !on)}
              aria-pressed={!autoplay}
            >
              {autoplay ? 'Pause' : 'Play'}
              <span className="sr-only"> automatic rotation</span>
            </button>
          )}
        </div>

        <p className="sr-only" aria-live={rotating ? 'off' : 'polite'} aria-atomic="true">
          {`Showing ${current.name}, ${CATEGORY_LABELS[current.category]} template, ${active + 1} of ${count}.`}
        </p>
      </div>
    </section>
  )
}
