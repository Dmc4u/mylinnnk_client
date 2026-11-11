/**
 * Which guest drafts on this device have been imported into which account.
 * Kept apart from the drafts themselves (the local drafts are never changed
 * or deleted by importing).
 *
 *   mylinnnk.imports.v1.<userId> → { [clientId]: { pageId, importedAt } }
 *
 * "Not now" (postponing the import offer) lasts for this browser session.
 */
const marksKey = (userId) => `mylinnnk.imports.v1.${userId}`
const postponeKey = (userId) => `mylinnnk.importPostponed.v1.${userId}`

const read = (key, store) => {
  try {
    return JSON.parse(store.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

export function getImportMarks(userId) {
  if (!userId) return {}
  const marks = read(marksKey(userId), window.localStorage)
  return marks && typeof marks === 'object' ? marks : {}
}

export function markImported(userId, clientId, pageId) {
  try {
    window.localStorage.setItem(marksKey(userId), JSON.stringify({ ...getImportMarks(userId), [clientId]: { pageId, importedAt: new Date().toISOString() } }))
  } catch {
    /* the server still has the draft; the offer may simply show again */
  }
}

export function isImportPostponed(userId) {
  try {
    return window.sessionStorage.getItem(postponeKey(userId)) === '1'
  } catch {
    return false
  }
}

export function postponeImport(userId, postponed = true) {
  try {
    if (postponed) window.sessionStorage.setItem(postponeKey(userId), '1')
    else window.sessionStorage.removeItem(postponeKey(userId))
  } catch {
    /* ignore */
  }
}
