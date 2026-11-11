/**
 * Render-time handling of uploaded images that aren't in this browser.
 *
 * Uploaded images live in the IndexedDB of the device where they were added
 * (cloud media sync comes in a later stage). When a cloud draft is opened
 * elsewhere, such an image shows the original template photo it replaced, or
 * a labelled placeholder. This only affects the render copy: the page keeps
 * its media references untouched, so nothing is lost when the draft is saved.
 */

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<rect width="800" height="600" fill="#eceef3"/>
<g fill="none" stroke="#59627a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" transform="translate(340 200)">
<rect x="0" y="0" width="120" height="96" rx="12"/><circle cx="38" cy="34" r="10"/><path d="M8 88l36-34 26 22 18-14 24 24"/></g>
<text x="400" y="368" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="600" fill="#33456e">Image on another device</text>
<text x="400" y="410" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="22" fill="#59627a">It shows where it was uploaded</text>
</svg>`

export const MISSING_IMAGE_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PLACEHOLDER_SVG)}`

const isImage = (v) => v && typeof v === 'object' && !Array.isArray(v) && ('src' in v || 'mediaId' in v || 'alt' in v)

/**
 * Returns { page, missing } where `page` is a render-only copy with object
 * URLs (or fallbacks) as `src`, and `missing` lists the media ids this browser
 * doesn't have. Until `loaded` is true nothing counts as missing.
 */
export function resolveMediaForRender(page, urls, { loaded = true } = {}) {
  const missing = new Set()
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      if (isImage(v) && v.mediaId) {
        const url = urls.get(v.mediaId)
        if (url) return { ...v, src: url }
        if (!loaded) return { ...v, src: undefined }
        missing.add(v.mediaId)
        return { ...v, src: v.original?.src ?? MISSING_IMAGE_SRC }
      }
      return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, walk(val)]))
    }
    return v
  }
  const sections = page.sections.map((s) => ({ ...s, content: walk(s.content) }))
  return { page: { ...page, sections }, missing: [...missing] }
}
