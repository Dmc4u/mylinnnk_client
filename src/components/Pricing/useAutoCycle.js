import { useCallback, useEffect, useRef, useState } from 'react'

/** How long a card stays in front before the next one comes forward. */
export const AUTO_CYCLE_MS = 4000

const prefersReducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

/**
 * Automatic rotation for the plan stack: brings the next card forward every
 * AUTO_CYCLE_MS, using one timeout at a time.
 *
 * It pauses while
 *   - the mouse is over the stack (until it leaves, even after a click),
 *   - a mouse button, finger or pen is pressed on it (until released or cancelled),
 *   - keyboard focus is inside it (until focus leaves),
 *   - the stack is off screen or the browser tab is hidden,
 *   - the person pressed Pause (or asked for reduced motion: then it starts paused).
 * Every time the front card changes, by hand or automatically, and every time a
 * pause ends, the full interval starts again, so nothing moves right away.
 *
 * Rotation only changes which card is in front (`onAdvance`); it never selects.
 *
 * Returns { stopped, toggleStopped, running, handlers } — spread `handlers` on the
 * stack's root element and attach `rootRef` to it.
 */
export default function useAutoCycle({ ready, rootRef, frontKey, onAdvance, intervalMs = AUTO_CYCLE_MS }) {
  const [stopped, setStopped] = useState(prefersReducedMotion)
  const [holds, setHolds] = useState({ hover: false, press: false, focus: false })
  const [inView, setInView] = useState(() => typeof window === 'undefined' || !('IntersectionObserver' in window))
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')

  const advance = useRef(onAdvance)
  useEffect(() => {
    advance.current = onAdvance
  })

  const hold = useCallback((key, value) => setHolds((h) => (h[key] === value ? h : { ...h, [key]: value })), [])

  const running = Boolean(ready) && !stopped && inView && tabVisible && !holds.hover && !holds.press && !holds.focus

  // The one timer. Restarts whenever the front card changes or rotation resumes.
  useEffect(() => {
    if (!running) return undefined
    const timer = setTimeout(() => advance.current?.(), intervalMs)
    return () => clearTimeout(timer)
  }, [running, frontKey, intervalMs])

  // Only rotate while the stack is on screen.
  useEffect(() => {
    const root = rootRef.current
    if (!ready || !root || !('IntersectionObserver' in window)) return undefined
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 })
    observer.observe(root)
    return () => observer.disconnect()
  }, [ready, rootRef])

  // …and while the tab is visible.
  useEffect(() => {
    const onChange = () => setTabVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  // A press ends wherever the pointer is released (or the gesture is cancelled, e.g. by scrolling).
  useEffect(() => {
    if (!holds.press) return undefined
    const end = () => hold('press', false)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('blur', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      window.removeEventListener('blur', end)
    }
  }, [holds.press, hold])

  // When the last press happened: focus that follows a press came from a pointer, not the keyboard.
  const pressedAt = useRef(0)

  const handlers = {
    // Pointer events cover mouse, touch and pen once each (no separate touch handlers, so nothing fires twice).
    onPointerEnter: (e) => e.pointerType === 'mouse' && hold('hover', true),
    onPointerLeave: (e) => e.pointerType === 'mouse' && hold('hover', false),
    onPointerDown: () => {
      pressedAt.current = Date.now()
      hold('press', true)
    },
    // Keyboard focus only: a click also focuses a button, but must not keep rotation paused after the mouse leaves.
    onFocus: () => {
      if (Date.now() - pressedAt.current > 600) hold('focus', true)
    },
    onBlur: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) hold('focus', false)
    },
  }

  return { stopped, toggleStopped: () => setStopped((s) => !s), running, handlers }
}
