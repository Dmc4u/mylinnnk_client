import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'

// Scroll positions by history entry, so Back/Forward return to where you were.
const positions = new Map()

/**
 * - Back/Forward (POP): restores the scroll position saved for that history entry.
 * - New page (PUSH/REPLACE to another path): scrolls to the top, or to the
 *   element named in the URL hash (e.g. "/#features").
 * - Search-param changes on the same page (gallery filters, search) are left
 *   alone so typing never jumps the page.
 */
export default function ScrollManager() {
  const { pathname, hash, key } = useLocation()
  const navigationType = useNavigationType()
  const previous = useRef({ pathname, hash })

  // Remember the current entry's scroll position as the user scrolls.
  useEffect(() => {
    let frame = 0
    const save = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => positions.set(key, window.scrollY))
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      window.removeEventListener('scroll', save)
      cancelAnimationFrame(frame)
    }
  }, [key])

  useEffect(() => {
    const changedPage = previous.current.pathname !== pathname || previous.current.hash !== hash
    previous.current = { pathname, hash }

    if (navigationType === 'POP') {
      const saved = positions.get(key)
      if (saved !== undefined) {
        window.scrollTo({ top: saved, left: 0, behavior: 'instant' })
        return
      }
    } else if (!changedPage) {
      return
    }

    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (target) {
        target.scrollIntoView()
        return
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash, key, navigationType])

  return null
}
