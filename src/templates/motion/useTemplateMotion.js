import { useLayoutEffect } from 'react'
import { runCountUp } from './countUp.js'

/**
 * What animates inside a section, by kind, in priority order. Selectors use the shared template
 * building blocks (headings, text, images, buttons, list items, cards), so every section built from
 * them, including future ones, is covered without template-specific code. An element is animated
 * only if no ancestor inside the section already is, so nothing moves twice.
 * To animate a new kind of element: add its selector to the matching kind (or a new kind + CSS).
 */
export const MOTION_TARGETS = [
  ['item', 'li, .ts-stats__item, .ts-timeline__item, .ts-gallery__item, .ts-countdown__part, .ts-details__item, .ts-contact__item'],
  ['media', 'img, .ts-progress__track'],
  ['heading', '.ts-display, .ts-script, h1, h2, h3, blockquote'],
  ['action', '.ts-action'],
  ['text', '.ts-eyebrow, .ts-body, p, figcaption'],
]
const SKIP = '.ts-marquee, .ts-ornament, nav'
const MAX_PER_SECTION = 48
const MAX_STAGGER_STEPS = 8

/** Marks the elements of one section to animate (data-m = kind, --m-i = stagger step). */
export function markTargets(section) {
  const marked = []
  const all = section.querySelectorAll(MOTION_TARGETS.map(([, s]) => s).join(','))
  for (const el of all) {
    if (marked.length >= MAX_PER_SECTION) break
    if (el.closest(SKIP) || marked.some((m) => m.contains(el))) continue
    const kind = MOTION_TARGETS.find(([, s]) => el.matches(s))[0]
    el.setAttribute('data-m', kind)
    el.style.setProperty('--m-i', String(Math.min(marked.length, MAX_STAGGER_STEPS)))
    marked.push(el)
  }
  return marked
}

const canAnimate = () =>
  typeof window !== 'undefined' &&
  'IntersectionObserver' in window &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Scroll reveals for a rendered template (`rootRef`: the .tpl element). When `enabled`:
 * - each section waits hidden (m-wait) and is revealed (m-in) the first time it enters view, by one
 *   IntersectionObserver (it respects nested scrolling containers such as the editor's preview);
 * - sections on the first screen reveal at once (their entrance starts immediately);
 * - m-on marks sections currently in view, so looping ornament motion pauses off-screen;
 * - statistics count up when revealed.
 * Content is never hidden without this running: the root's data-motion-ready flag (set here, before
 * the first paint) is what enables hiding in CSS, and it is removed on cleanup. Without
 * IntersectionObserver, or with reduced motion, nothing is hidden or moved.
 */
export function useTemplateMotion(rootRef, { enabled, key }) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!enabled || !root || !canAnimate()) return undefined
    const sections = [...root.querySelectorAll(':scope > [data-section]')]
    if (!sections.length) return undefined

    const cancels = []
    const reveal = (section) => {
      if (section.classList.contains('m-in')) return
      section.classList.remove('m-wait')
      section.classList.add('m-in')
      for (const el of section.querySelectorAll('[data-countup]')) cancels.push(runCountUp(el))
    }

    for (const section of sections) {
      markTargets(section)
      section.classList.add('m-wait')
    }
    root.setAttribute('data-motion-ready', '')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle('m-on', entry.isIntersecting)
          if (entry.isIntersecting) reveal(entry.target)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    for (const section of sections) observer.observe(section)

    // Never leave content waiting: a section that takes focus (keyboard), or anything still waiting
    // when the page is printed, is shown at once.
    const onFocus = (event) => {
      const section = event.target.closest?.('[data-section]')
      if (section && root.contains(section)) reveal(section)
    }
    const onPrint = () => sections.forEach(reveal)
    root.addEventListener('focusin', onFocus)
    window.addEventListener('beforeprint', onPrint)

    return () => {
      observer.disconnect()
      root.removeEventListener('focusin', onFocus)
      window.removeEventListener('beforeprint', onPrint)
      cancels.forEach((cancel) => cancel())
      root.removeAttribute('data-motion-ready')
      for (const section of sections) section.classList.remove('m-wait', 'm-in', 'm-on')
    }
  }, [rootRef, enabled, key])
}
