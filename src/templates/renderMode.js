import { createContext } from 'react'
import { isSafeLink } from '../editor/model/page.js'

/**
 * Where a page is drawn: 'design' (editor, template gallery and previews) or 'published' (/p/:slug).
 * Set by TemplateRender; read by the template primitives.
 */
export const RenderModeContext = createContext('design')

/** A button link a page may follow: https/http, mailto:, tel: or #section (the editor's own rule), else null. */
export const usableHref = (href) => (typeof href === 'string' && href.trim() !== '' && isSafeLink(href.trim()) ? href.trim() : null)

/** Section ids that can be used as #anchors on a published page. */
export const anchorId = (id) => (typeof id === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id) ? id : undefined)
