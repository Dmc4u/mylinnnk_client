import { API_BASE, apiRequest } from '../../auth/authApi.js'
import { getTemplateBySlug } from '../../data/templates.js'
import { resolveMediaForRender } from '../../editor/model/mediaFallback.js'
import { pageForRender, validatePage } from '../../editor/model/page.js'
import { SECTION_COMPONENTS } from '../../templates/registry.js'
import { SECTION_TYPES } from '../../templates/schema.js'

/**
 * Published pages (Phase 5, Stage 2): GET /api/v1/public/pages/:slug.
 *
 * The server already validated the content when the page went live, but the
 * public page treats it as untrusted anyway: it keeps only section types this
 * app knows how to draw, then runs the editor's own cleaner (allowed fields,
 * safe links only, valid colours and fonts). Text is rendered by React as
 * text, never as HTML.
 */

/** "/api/v1/public/pages/<slug>/media/<mediaId>": the only way a public page loads uploaded images. */
export const publicMediaUrl = (slug, mediaId) => `${API_BASE}/public/pages/${encodeURIComponent(slug)}/media/${encodeURIComponent(mediaId)}`

/**
 * Turns the API's page into something TemplateRender can draw, or null if
 * nothing safe and supported is left.
 */
export function preparePublishedPage(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sections)) return null
  const sections = raw.sections.filter((s) => s && typeof s === 'object' && SECTION_TYPES[s.type] && SECTION_COMPONENTS[s.type])
  if (!sections.length) return null
  const checked = validatePage(
    { ...raw, sections, id: 'draft_published', status: 'published', storage: 'cloud' },
    { templateExists: (slug) => Boolean(getTemplateBySlug(slug)) },
  )
  if (!checked.ok) return null

  const slug = String(raw.slug ?? '')
  const ids = new Set()
  JSON.stringify(checked.page.sections, (key, value) => {
    if (key === 'mediaId' && typeof value === 'string') ids.add(value)
    return value
  })
  const urls = new Map([...ids].map((id) => [id, publicMediaUrl(slug, id)]))
  const { page } = resolveMediaForRender(checked.page, urls)
  return { title: checked.page.title, render: pageForRender(page) }
}

/** → { status: 'ready', page } | { status: 'not_found' | 'unavailable' | 'error', error } */
export async function loadPublishedPage(slug) {
  try {
    const data = await apiRequest(`/public/pages/${encodeURIComponent(slug)}`)
    const prepared = preparePublishedPage(data?.page)
    return prepared ? { status: 'ready', page: prepared } : { status: 'unavailable' }
  } catch (error) {
    if (error?.status === 404) return { status: 'not_found' }
    if (error?.status === 410) return { status: 'unavailable' }
    return { status: 'error', error }
  }
}
