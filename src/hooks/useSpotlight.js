/**
 * Returns a pointermove handler that writes --mx / --my (px) onto the
 * hovered element, for CSS cursor-spotlight effects (see .lift-card).
 */
export default function useSpotlight() {
  return (event) => {
    if (event.pointerType !== 'mouse') return
    const el = event.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    el.style.setProperty('--my', `${event.clientY - rect.top}px`)
  }
}
