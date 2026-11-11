/**
 * Recovery copies of cloud-draft edits that the server hasn't confirmed yet
 * (offline, session expired, conflict, closed tab before the save finished).
 *
 *   mylinnnk.recovery.v1.<userId>.<clientId> → { userId, clientId, serverId, baseRevision,
 *                                                 templateSlug, title, page, savedAt }
 *
 * - Scoped to one account: every read filters by the signed-in user's id, so
 *   another person signing in on this browser never sees them.
 * - Removed only after the server confirms the same content (or the user
 *   explicitly discards them). Never treated as proof of a cloud save.
 * - Kept when the user logs out (they're warned first).
 */
const PREFIX = 'mylinnnk.recovery.v1.'
const keyFor = (userId, clientId) => `${PREFIX}${userId}.${clientId}`

function storage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function saveRecovery(userId, entry) {
  if (!userId) return false
  try {
    storage()?.setItem(keyFor(userId, entry.clientId), JSON.stringify({ ...entry, userId, savedAt: new Date().toISOString() }))
    return true
  } catch {
    return false // full or blocked storage: the editor still holds the changes in memory
  }
}

export function readRecovery(userId, clientId) {
  if (!userId || !clientId) return null
  try {
    const entry = JSON.parse(storage()?.getItem(keyFor(userId, clientId)) ?? 'null')
    return entry && entry.userId === userId && entry.clientId === clientId && entry.page ? entry : null
  } catch {
    return null
  }
}

export function removeRecovery(userId, clientId) {
  try {
    storage()?.removeItem(keyFor(userId, clientId))
  } catch {
    /* nothing to remove */
  }
}

/** This user's unconfirmed drafts (newest first). */
export function listRecoveries(userId) {
  const s = storage()
  if (!s || !userId) return []
  const prefix = `${PREFIX}${userId}.`
  const entries = []
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i)
    if (!key?.startsWith(prefix)) continue
    const entry = readRecovery(userId, key.slice(prefix.length))
    if (entry) entries.push(entry)
  }
  return entries.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
}
