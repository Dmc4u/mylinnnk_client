/**
 * Cookie and storage consent.
 *
 * MyLinnnk currently uses only strictly necessary storage (STORAGE_ITEMS): no analytics, advertising or
 * other optional cookies. CONSENT_CATEGORIES therefore has a single, always-on category. If an optional
 * feature is ever added, give it a category here (required: false) and gate it with hasConsent(id):
 * optional categories are off until the visitor turns them on at /cookie-settings, and the choice is
 * remembered in this browser (CONSENT_KEY).
 */
export const CONSENT_KEY = 'mylinnnk.consent.v1'

export const CONSENT_CATEGORIES = Object.freeze([
  {
    id: 'necessary',
    required: true,
    title: 'Strictly necessary',
    description: 'Keep you signed in and keep your work safe on this device. MyLinnnk can’t work without them, so they are always on.',
  },
])

/** Everything MyLinnnk stores in your browser (kept in step with the code; see the tests). */
export const STORAGE_ITEMS = Object.freeze([
  {
    name: 'mylinnnk_session (__Host-mylinnnk_session on the live site)',
    kind: 'Cookie (HttpOnly, Secure, SameSite=Lax)',
    purpose: 'Keeps you signed in. Page scripts can’t read it.',
    duration: 'Until you sign out, or 30 days',
    category: 'necessary',
  },
  {
    name: 'mylinnnk.drafts.index.v1 and mylinnnk.draft.v1.*',
    kind: 'Local storage',
    purpose: 'Pages you make without an account, saved on this device only.',
    duration: 'Until you delete them',
    category: 'necessary',
  },
  {
    name: 'mylinnnk.recovery.v1.*',
    kind: 'Local storage',
    purpose: 'A safety copy of unsaved changes, so nothing is lost if your connection drops.',
    duration: 'Until the changes are saved or discarded',
    category: 'necessary',
  },
  {
    name: 'mylinnnk.imports.v1.* and mylinnnk.importPostponed.v1.*',
    kind: 'Local and session storage',
    purpose: 'Remembers which device drafts you’ve already copied to your account, or chose to copy later.',
    duration: 'Until you clear site data (the “later” choice ends with the browser session)',
    category: 'necessary',
  },
  {
    name: 'mylinnnk-media',
    kind: 'IndexedDB (browser database)',
    purpose: 'Images you add to pages on this device, before they’re uploaded to your account.',
    duration: 'Until you delete the draft or clear site data',
    category: 'necessary',
  },
])

const storage = () => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** { decidedAt, choices: { [optionalCategoryId]: boolean } } or null if no choice was saved. */
export function readConsent(categories = CONSENT_CATEGORIES) {
  try {
    const raw = JSON.parse(storage()?.getItem(CONSENT_KEY) ?? 'null')
    if (!raw || typeof raw !== 'object' || typeof raw.choices !== 'object') return null
    const choices = {}
    for (const c of categories) if (!c.required && typeof raw.choices[c.id] === 'boolean') choices[c.id] = raw.choices[c.id]
    return { decidedAt: typeof raw.decidedAt === 'string' ? raw.decidedAt : null, choices }
  } catch {
    return null
  }
}

/** Saves the visitor's choices for optional categories (required ones are never stored as choices). */
export function saveConsent(choices, categories = CONSENT_CATEGORIES, now = new Date()) {
  const clean = {}
  for (const c of categories) if (!c.required) clean[c.id] = choices[c.id] === true
  const record = { decidedAt: now.toISOString(), choices: clean }
  storage()?.setItem(CONSENT_KEY, JSON.stringify(record))
  return record
}

/** Whether a category may be used now: required ones always; optional ones only after an explicit yes. */
export function hasConsent(id, categories = CONSENT_CATEGORIES) {
  const category = categories.find((c) => c.id === id)
  if (!category) return false
  if (category.required) return true
  return readConsent(categories)?.choices[id] === true
}
