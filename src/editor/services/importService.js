/**
 * Guest-to-account import: copies a local draft into the signed-in user's
 * cloud drafts. Explicit only (the UI asks for confirmation first).
 *
 * - The local draft keeps its id as the cloud clientId, so a repeated or
 *   interrupted import is safe: the API returns the draft it already has
 *   instead of creating a duplicate, and never overwrites anything.
 * - The local draft and its IndexedDB images are left untouched; a separate
 *   marker records the import (importMarks.js). The cloud draft also becomes an
 *   owner of those images on this device, so deleting the local draft later
 *   doesn't remove images the imported draft still uses.
 * - The imported draft's images (on this device) are then uploaded to the account in
 *   the background (mediaSync.js); they also stay on this device.
 */
import { collectMediaIds, newId } from '../model/page.js'
import { getImportMarks, markImported } from '../storage/importMarks.js'
import { claimMedia, cloudOwner } from '../storage/mediaStore.js'
import { cloudDraftApi, toCloudContent } from './cloudDrafts.js'
import { syncMedia } from './mediaSync.js'
import { localDrafts } from './draftService.js'

/** Local drafts with their import state for this user. Unreadable drafts are reported, not hidden. */
export async function findImportCandidates(userId) {
  const marks = getImportMarks(userId)
  const summaries = await localDrafts.listDrafts().catch(() => [])
  const candidates = []
  for (const summary of summaries) {
    const loaded = await localDrafts.loadDraft(summary.id).catch(() => ({ ok: false }))
    candidates.push({
      id: summary.id,
      title: summary.title || 'Untitled page',
      templateSlug: summary.templateSlug,
      updatedAt: summary.updatedAt,
      valid: loaded.ok,
      mediaCount: loaded.ok ? collectMediaIds(loaded.page).size : 0,
      imported: marks[summary.id] ?? null,
    })
  }
  return candidates
}

/**
 * Imports one local draft. Returns
 *   { status: 'imported', pageId, created }   (created=false: it was already there)
 *   { status: 'conflict' | 'deleted' | 'failed', message, retryable }
 * `asCopy` imports under a new clientId (after a conflict or a deleted cloud copy).
 */
export async function importLocalDraft({ withCsrf, userId, draftId, asCopy = false }) {
  const loaded = await localDrafts.loadDraft(draftId).catch(() => ({ ok: false }))
  if (!loaded.ok) return { status: 'failed', message: 'This draft is damaged and can’t be imported.', retryable: false }
  let content
  try {
    content = toCloudContent(loaded.page)
  } catch (error) {
    return { status: 'failed', message: error.message, retryable: false }
  }
  const clientId = asCopy ? newId('draft') : loaded.page.id
  if (asCopy) content.title = `${content.title} (copy)`.slice(0, 120)
  try {
    const { created, draft } = await withCsrf((csrf) => cloudDraftApi.create(csrf, clientId, content))
    const mediaIds = [...collectMediaIds(loaded.page)]
    await claimMedia(mediaIds, cloudOwner(draft.clientId))
    markImported(userId, loaded.page.id, draft.id)
    // Explicit import = these images now belong to a cloud draft: upload them (background, retry-safe).
    if (mediaIds.length) syncMedia({ userId, mediaIds, withCsrf }).catch(() => {})
    return { status: 'imported', pageId: draft.id, created }
  } catch (error) {
    if (error?.code === 'CLIENT_ID_CONFLICT') {
      return { status: 'conflict', message: 'Your account already has a different version of this draft. Nothing was overwritten.', retryable: false }
    }
    if (error?.code === 'DRAFT_DELETED') {
      return { status: 'deleted', message: 'This draft was imported before and then deleted from your account.', retryable: false }
    }
    return { status: 'failed', message: error?.message ?? 'The import didn’t finish.', retryable: error?.isUnavailable || error?.status === 429 || error?.status === 0 }
  }
}
