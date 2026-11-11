/**
 * Draft persistence boundary.
 *
 * `localDrafts` — guest drafts in this browser (works today).
 * `remoteDrafts` — the future authenticated API (MongoDB). Every call throws
 * FeatureUnavailableError until the backend exists, so the UI can never
 * pretend a draft was saved to an account.
 *
 * Both expose the same interface:
 *   saveDraft(page) → page        loadDraft(pageId) → page | null
 *   listDrafts()    → summaries   deleteDraft(pageId)
 */
import { getTemplateBySlug } from '../../data/templates.js'
import { validatePage } from '../model/page.js'
import { listLocalDrafts, readLocalDraft, removeLocalDraft, writeLocalDraft } from '../storage/localDraftStore.js'
import { localOwner, releaseOwnerMedia } from '../storage/mediaStore.js'
import { FeatureUnavailableError } from './errors.js'

const templateExists = (slug) => {
  const t = getTemplateBySlug(slug)
  return Boolean(t && t.status === 'available')
}

export const localDrafts = {
  async saveDraft(page) {
    const stored = { ...page, storage: 'local', updatedAt: new Date().toISOString() }
    writeLocalDraft(stored)
    return stored
  },

  /** Returns { ok, page } / { ok: false, errors } so callers can explain a damaged draft. */
  async loadDraft(pageId) {
    const raw = readLocalDraft(pageId)
    if (!raw) return { ok: false, errors: ['Draft not found'], missing: true }
    return validatePage(raw, { templateExists })
  },

  async listDrafts() {
    return listLocalDrafts().filter((d) => templateExists(d.templateSlug))
  },

  async deleteDraft(pageId) {
    removeLocalDraft(pageId)
    // Only this draft's claim: images also used by a copy or an imported cloud draft are kept.
    await releaseOwnerMedia(localOwner(pageId))
  },
}

const unavailable = () => {
  throw new FeatureUnavailableError('accounts', 'Saving drafts to an account is coming soon.')
}

export const remoteDrafts = {
  saveDraft: unavailable,
  loadDraft: unavailable,
  listDrafts: unavailable,
  deleteDraft: unavailable,
}
