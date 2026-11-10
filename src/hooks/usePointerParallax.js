import { useEffect } from 'react'

/**
 * Tracks the pointer over `ref` and writes smoothed CSS custom properties:
 *   --px / --py : pointer position normalised to -1…1 (for parallax)
 *   --mx / --my : pointer position in px relative to the element (for spotlights)
 * Adds `is-pointer` to the element while a fine pointer hovers it.
 * Disabled on touch devices and when the user prefers reduced motion.
 */
export default function usePointerParallax(ref, { smoothing = 0.1 } = {}) {
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const enabled = () => finePointer.matches && !reducedMotion.matches

    let frame = 0
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0

    const tick = () => {
      currentX += (targetX - currentX) * smoothing
      currentY += (targetY - currentY) * smoothing
      el.style.setProperty('--px', currentX.toFixed(4))
      el.style.setProperty('--py', currentY.toFixed(4))

      const settled =
        Math.abs(targetX - currentX) < 0.0005 && Math.abs(targetY - currentY) < 0.0005
      frame = settled ? 0 : requestAnimationFrame(tick)
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const onMove = (event) => {
      if (!enabled()) return
      const rect = el.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      el.style.setProperty('--mx', `${x}px`)
      el.style.setProperty('--my', `${y}px`)
      targetX = (x / rect.width - 0.5) * 2
      targetY = (y / rect.height - 0.5) * 2
      el.classList.add('is-pointer')
      schedule()
    }

    const onLeave = () => {
      targetX = 0
      targetY = 0
      el.classList.remove('is-pointer')
      schedule()
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)

    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frame)
    }
  }, [ref, smoothing])
}
