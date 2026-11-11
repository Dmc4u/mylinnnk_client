/**
 * Cloud drafts: the signed-in user's pages stored by the MyLinnnk API
 * (/api/v1/pages). The page document is the editor's own format; the API
 * stores the editable fields and manages owner, status, revision and dates.
 *
 * Writes need the session's CSRF token, so callers pass them through
 * useAuth().withCsrf, which also handles expired sessions.
 */
import { getTemplateBySlug } from '../../data/templates.js'
import { apiRequest } from '../../auth/authApi.js'
import { collectMediaIds, validatePage } from '../model/page.js'

/** The fields of an editor page that the API stores (everything else is server-managed). */
export const EDITABLE_FIELDS = ['templateId', 'templateSlug', 'templateCategory', 'title', 'schemaVersion', 'theme', 'sections']

const templateExists = (slug) => {
  const t = getTemplateBySlug(slug)
  return Boolean(t && t.status === 'available')
}

/** Normalises a page with the editor's own cleaner and keeps only the editable fields. */
export function toCloudContent(page) {
  const result = validatePage(page, { templateExists })
  if (!result.ok) throw new Error(`This draft can’t be saved: ${result.errors.join(', ')}`)
  return Object.fromEntries(EDITABLE_FIELDS.map((key) => [key, result.page[key]]))
}

/**
 * Turns an API draft into { page, cloud } for the editor. The page keeps the
 * editor's own id (the clientId) so this device's images still match it.
 */
export function fromCloudDraft(draft) {
  const result = validatePage(draft.page, { templateExists })
  if (!result.ok) return { ok: false, errors: result.errors }
  return {
    ok: true,
    page: { ...result.page, storage: 'cloud', createdAt: draft.createdAt, updatedAt: draft.updatedAt },
    cloud: { id: draft.id, revision: draft.revision, deviceMediaIds: draft.deviceMediaIds ?? [...collectMediaIds(result.page)] },
  }
}

const ifMatch = (revision) => ({ 'If-Match': `"${revision}"` })

export const cloudDraftApi = {
  /** → summaries, newest first */
  list: () => apiRequest('/pages').then((data) => data.drafts),
  /** → draft detail */
  get: (id) => apiRequest(`/pages/${encodeURIComponent(id)}`).then((data) => data.draft),
  /** → { created, draft }; a retry with the same clientId and content returns the existing draft */
  create: (csrfToken, clientId, content) => apiRequest('/pages', { method: 'POST', body: { clientId, page: content }, csrfToken }),
  /** → draft; 409 REVISION_CONFLICT if `revision` is no longer the latest */
  update: (csrfToken, id, revision, content) =>
    apiRequest(`/pages/${encodeURIComponent(id)}`, { method: 'PATCH', body: { page: content }, csrfToken, headers: ifMatch(revision) }).then((data) => data.draft),
  /** Soft delete (kept 30 days by the server, then removed). */
  remove: (csrfToken, id, revision) => apiRequest(`/pages/${encodeURIComponent(id)}`, { method: 'DELETE', csrfToken, headers: ifMatch(revision) }),
}
