/**
 * Editable page documents.
 *
 * A page is an independent, JSON-serialisable copy of a template that the
 * user edits. It never references the original template object, so editing
 * can't mutate template definitions. The shape is designed to map directly
 * onto a future MongoDB `pages` document:
 *
 *   {
 *     id, templateId, templateSlug, templateCategory, title,
 *     status: 'draft', storage: 'local', schemaVersion,
 *     theme: { colors, fonts, type, radius, ornament, imageFilter },
 *     sections: [{ id, type, variant, tone?, options?, content }],
 *     createdAt, updatedAt,
 *   }
 *
 * Uploaded images are referenced by `mediaId` only; object URLs are created
 * at render time and never stored.
 */
import { GENERIC_OPTIONS, SECTION_TONES, SECTION_TYPES, validateTemplate } from '../../templates/schema.js'
import { FONT_STACKS, IMAGE_FILTERS, RADII } from '../../templates/theme.js'
import { PAGE_STATES } from '../config/plans.js'

export const PAGE_SCHEMA_VERSION = 1
export const MAX_SECTIONS = 30
const MAX_TEXT = 5000
const MAX_TITLE = 120

export const newId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`

/** Creates a new local draft from a template (deep copy; the template is untouched). */
export function createPageFromTemplate(template) {
  const now = new Date().toISOString()
  return {
    id: newId('draft'),
    templateId: template.slug,
    templateSlug: template.slug,
    templateCategory: template.category,
    title: `My ${template.name} page`,
    status: 'draft',
    storage: 'local',
    schemaVersion: PAGE_SCHEMA_VERSION,
    theme: structuredClone(template.theme),
    sections: structuredClone(template.sections),
    createdAt: now,
    updatedAt: now,
  }
}

/* ---------------- Sanitising & validation ---------------- */

const SAFE_LINK = /^(https?:\/\/|mailto:|tel:|#)[^\s<>"'`]*$/i
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i
const MEDIA_ID = /^media_[a-z0-9]{8,32}$/
const TEMPLATE_SRC = /^\/template-media\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/

export const isSafeLink = (value) => value === '' || SAFE_LINK.test(value)

/** Keeps only plain JSON data: strings, finite numbers, booleans, arrays, plain objects. */
function plain(value, depth = 0) {
  if (depth > 8) return undefined
  if (typeof value === 'string') return value.slice(0, MAX_TEXT)
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.slice(0, 60).map((v) => plain(v, depth + 1)).filter((v) => v !== undefined)
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue
      const clean = plain(v, depth + 1)
      if (clean !== undefined) out[k] = clean
    }
    return out
  }
  return undefined
}

/** An image is valid if it points to a bundled template photo or an uploaded media id. */
function cleanImage(image) {
  if (!image || typeof image !== 'object') return undefined
  const out = { alt: typeof image.alt === 'string' ? image.alt : '' }
  if (typeof image.src === 'string' && TEMPLATE_SRC.test(image.src)) out.src = image.src
  if (typeof image.mediaId === 'string' && MEDIA_ID.test(image.mediaId)) out.mediaId = image.mediaId
  for (const key of ['focus', 'caption']) if (typeof image[key] === 'string') out[key] = image[key]
  if (image.original && typeof image.original === 'object') out.original = cleanImage(image.original)
  return out.src || out.mediaId || out.original ? out : { alt: out.alt }
}

function cleanField(kind, value) {
  if (kind === 'image') return cleanImage(value)
  if (kind === 'link') return typeof value === 'string' && isSafeLink(value) ? value : undefined
  if (kind === 'number') return Number.isFinite(Number(value)) ? Number(value) : undefined
  if (kind === 'strings') return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : undefined
  if (typeof kind === 'object' && kind.kind === 'list') {
    if (!Array.isArray(value)) return undefined
    return value.map((item) => {
      if (kind.of === 'image') return cleanImage(item)
      const out = {}
      for (const [key, subKind] of Object.entries(kind.of)) {
        const clean = cleanField(subKind, item?.[key])
        if (clean !== undefined) out[key] = clean
      }
      return out
    }).filter(Boolean)
  }
  return typeof value === 'string' ? value : undefined
}

function cleanSection(section) {
  const def = SECTION_TYPES[section.type]
  const content = {}
  for (const [key, kind] of Object.entries(def.fields)) {
    const clean = cleanField(kind, section.content?.[key])
    if (clean !== undefined) content[key] = clean
  }
  const allowed = { ...(def.options ?? {}), ...GENERIC_OPTIONS }
  const options = {}
  for (const [key, value] of Object.entries(section.options ?? {})) {
    if (allowed[key]?.includes(value)) options[key] = value
  }
  return {
    id: String(section.id),
    type: section.type,
    variant: section.variant,
    ...(SECTION_TONES.includes(section.tone) && section.tone !== 'default' ? { tone: section.tone } : {}),
    ...(Object.keys(options).length ? { options } : {}),
    content,
  }
}

function cleanTheme(theme) {
  const colors = {}
  for (const [k, v] of Object.entries(theme?.colors ?? {})) if (typeof v === 'string' && COLOR.test(v.trim())) colors[k] = v.trim()
  const fonts = {}
  for (const [k, v] of Object.entries(theme?.fonts ?? {})) if (v in FONT_STACKS) fonts[k] = v
  return {
    colors,
    fonts,
    type: plain(theme?.type ?? {}),
    radius: theme?.radius in RADII ? theme.radius : 'soft',
    ...(typeof theme?.ornament === 'string' ? { ornament: theme.ornament } : {}),
    ...(IMAGE_FILTERS.includes(theme?.imageFilter) ? { imageFilter: theme.imageFilter } : {}),
  }
}

/** Brings older stored drafts up to the current schema version. */
export function migratePage(raw) {
  const page = { ...raw }
  // v1 is the first version; future migrations go here, e.g.
  // if (page.schemaVersion === 1) { ...; page.schemaVersion = 2 }
  return page
}

/**
 * Validates and cleans a page loaded from storage (or any untrusted source).
 * Returns { ok: true, page } or { ok: false, errors }.
 */
export function validatePage(raw, { templateExists }) {
  const errors = []
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['Not a page document'] }
  if (typeof raw.schemaVersion !== 'number' || raw.schemaVersion > PAGE_SCHEMA_VERSION) {
    return { ok: false, errors: [`Unsupported schema version ${raw.schemaVersion}`] }
  }
  const migrated = migratePage(raw)
  if (typeof migrated.id !== 'string' || !migrated.id.startsWith('draft_')) errors.push('Missing draft id')
  if (typeof migrated.templateSlug !== 'string' || !templateExists(migrated.templateSlug)) errors.push('Unknown template')
  if (!Array.isArray(migrated.sections) || migrated.sections.length === 0) errors.push('No sections')
  if (Array.isArray(migrated.sections) && migrated.sections.length > MAX_SECTIONS) errors.push('Too many sections')
  if (errors.length) return { ok: false, errors }

  const structural = validateTemplate({ slug: migrated.templateSlug, sections: migrated.sections }).filter(
    (p) => !p.includes('unexpected field') && !p.includes('unexpected option') && !p.includes('invalid '),
  )
  if (structural.length) return { ok: false, errors: structural }

  const page = {
    id: migrated.id,
    templateId: String(migrated.templateId ?? migrated.templateSlug),
    templateSlug: migrated.templateSlug,
    templateCategory: typeof migrated.templateCategory === 'string' ? migrated.templateCategory : '',
    title: (typeof migrated.title === 'string' ? migrated.title : 'Untitled page').slice(0, MAX_TITLE),
    status: PAGE_STATES.includes(migrated.status) ? migrated.status : 'draft',
    storage: 'local',
    schemaVersion: PAGE_SCHEMA_VERSION,
    theme: cleanTheme(migrated.theme),
    sections: migrated.sections.map(cleanSection),
    createdAt: typeof migrated.createdAt === 'string' ? migrated.createdAt : new Date().toISOString(),
    updatedAt: typeof migrated.updatedAt === 'string' ? migrated.updatedAt : new Date().toISOString(),
  }
  return { ok: true, page }
}

/* ---------------- Media references ---------------- */

const isImage = (v) => v && typeof v === 'object' && !Array.isArray(v) && ('src' in v || 'mediaId' in v || 'alt' in v)

/** Every uploaded media id referenced anywhere in the page. */
export function collectMediaIds(page) {
  const ids = new Set()
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') {
      if (typeof v.mediaId === 'string') ids.add(v.mediaId)
      Object.values(v).forEach(walk)
    }
  }
  page.sections.forEach((s) => walk(s.content))
  return ids
}

/**
 * Returns a render-only copy of the page where uploaded images get a
 * temporary object URL as `src`. The result must never be persisted.
 */
export function resolvePageMedia(page, urls) {
  if (!urls.size) return page
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      if (isImage(v) && v.mediaId) return { ...v, src: urls.get(v.mediaId) }
      return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, walk(val)]))
    }
    return v
  }
  return { ...page, sections: page.sections.map((s) => ({ ...s, content: walk(s.content) })) }
}

/** Shape TemplateRender expects (it was written for template definitions). */
export const pageForRender = (page) => ({ slug: page.templateSlug, theme: page.theme, sections: page.sections })
