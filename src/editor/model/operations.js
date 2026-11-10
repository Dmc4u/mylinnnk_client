/**
 * Pure page operations. Each returns a new page object (structural sharing)
 * and never mutates its input, which keeps undo/redo snapshots reliable.
 */
import { SECTION_RULES } from '../../templates/schema.js'
import { MAX_SECTIONS, newId } from './page.js'
import { createSection } from './sectionLibrary.js'

/** Immutable set at a path such as ['items', 2, 'title']. */
export function setIn(target, path, value) {
  if (path.length === 0) return value
  const [key, ...rest] = path
  const base = Array.isArray(target) ? [...target] : { ...(target ?? {}) }
  const next = setIn(base[key], rest, value)
  if (next === undefined) {
    if (Array.isArray(base)) base.splice(key, 1)
    else delete base[key]
  } else base[key] = next
  return base
}

export const getIn = (target, path) => path.reduce((v, k) => (v == null ? v : v[k]), target)

const mapSection = (page, id, fn) => ({ ...page, sections: page.sections.map((s) => (s.id === id ? fn(s) : s)) })

export const setTitle = (page, title) => ({ ...page, title })

export const setContent = (page, sectionId, path, value) =>
  mapSection(page, sectionId, (s) => ({ ...s, content: setIn(s.content ?? {}, path, value) }))

export const setVariant = (page, sectionId, variant) => mapSection(page, sectionId, (s) => ({ ...s, variant }))

export const setTone = (page, sectionId, tone) =>
  mapSection(page, sectionId, (s) => {
    const next = { ...s, tone }
    if (!tone || tone === 'default') delete next.tone
    return next
  })

export const setOption = (page, sectionId, key, value) =>
  mapSection(page, sectionId, (s) => {
    const options = { ...(s.options ?? {}), [key]: value }
    if (value === undefined) delete options[key]
    const next = { ...s, options }
    if (!Object.keys(options).length) delete next.options
    return next
  })

export const setTheme = (page, path, value) => ({ ...page, theme: setIn(page.theme, path, value) })

/* ---------------- Section structure (respects SECTION_RULES) ---------------- */

const countType = (page, type) => page.sections.filter((s) => s.type === type).length

export function canRemove(page, section) {
  const rule = SECTION_RULES[section.type] ?? {}
  if (rule.removable === false) return false
  if (rule.min && countType(page, section.type) <= rule.min) return false
  return page.sections.length > 1
}

export function canDuplicate(page, section) {
  const rule = SECTION_RULES[section.type] ?? {}
  if (rule.duplicable === false) return false
  if (rule.max && countType(page, section.type) >= rule.max) return false
  return page.sections.length < MAX_SECTIONS
}

/** Index range a section may occupy (nav stays first; nothing moves above it). */
function allowedRange(page, section) {
  const navFirst = page.sections[0]?.type === 'nav'
  if (SECTION_RULES[section.type]?.position === 'first') return [0, 0]
  return [navFirst ? 1 : 0, page.sections.length - 1]
}

export function canMove(page, section, delta) {
  const index = page.sections.findIndex((s) => s.id === section.id)
  const [min, max] = allowedRange(page, section)
  return index + delta >= min && index + delta <= max
}

export function moveSection(page, sectionId, delta) {
  const index = page.sections.findIndex((s) => s.id === sectionId)
  if (index < 0 || !canMove(page, page.sections[index], delta)) return page
  const sections = [...page.sections]
  const [moved] = sections.splice(index, 1)
  sections.splice(index + delta, 0, moved)
  return { ...page, sections }
}

/** Moves a section to a target index (drag & drop), clamped to the allowed range. */
export function moveSectionTo(page, sectionId, targetIndex) {
  const index = page.sections.findIndex((s) => s.id === sectionId)
  if (index < 0) return page
  const [min, max] = allowedRange(page, page.sections[index])
  const to = Math.max(min, Math.min(max, targetIndex))
  if (to === index) return page
  const sections = [...page.sections]
  const [moved] = sections.splice(index, 1)
  sections.splice(to, 0, moved)
  return { ...page, sections }
}

export function removeSection(page, sectionId) {
  const section = page.sections.find((s) => s.id === sectionId)
  if (!section || !canRemove(page, section)) return page
  return { ...page, sections: page.sections.filter((s) => s.id !== sectionId) }
}

export function duplicateSection(page, sectionId, copyId = newId('sec')) {
  const index = page.sections.findIndex((s) => s.id === sectionId)
  const section = page.sections[index]
  if (!section || !canDuplicate(page, section)) return { page, id: null }
  const copy = { ...structuredClone(section), id: copyId }
  const sections = [...page.sections]
  sections.splice(index + 1, 0, copy)
  return { page: { ...page, sections }, id: copy.id }
}

/** Adds a new section of `type` after `afterId` (or at the end). Nav always goes first. */
export function addSection(page, type, afterId, sectionId) {
  if (page.sections.length >= MAX_SECTIONS) return { page, id: null }
  const section = createSection(type, sectionId)
  const sections = [...page.sections]
  if (SECTION_RULES[type]?.position === 'first') sections.unshift(section)
  else {
    const index = afterId ? sections.findIndex((s) => s.id === afterId) : -1
    sections.splice(index >= 0 ? index + 1 : sections.length, 0, section)
  }
  return { page: { ...page, sections }, id: section.id }
}
