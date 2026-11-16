/** "14 December 2026" in the visitor's own locale, or null. */
export const longDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null)

/**
 * A publication's state as the server reports it. "Live" only when the server says the page is
 * publicly visible right now; every other state says what it is.
 */
export function publicationState(p) {
  if (p.suspended) return { label: 'Suspended', tone: 'warn', hint: 'This page is suspended. Please contact support.' }
  if (p.publiclyVisible) return { label: 'Live', tone: 'ok', hint: p.expiresAt ? `Live until ${longDate(p.expiresAt)}` : null }
  switch (p.effectiveStatus) {
    case 'pending_payment':
      return { label: 'Waiting for payment', tone: 'pending', hint: 'Finish your payment to publish this page.' }
    case 'pending_review':
      return { label: 'Payment under review', tone: 'pending', hint: 'We’re checking your transfer. Your page goes live once it’s confirmed.' }
    case 'scheduled':
      return { label: 'Scheduled', tone: 'pending', hint: p.activatedAt ? `Goes live on ${longDate(p.activatedAt)}` : null }
    case 'grace':
    case 'expired':
      return { label: 'Expired', tone: 'warn', hint: p.expiresAt ? `Expired on ${longDate(p.expiresAt)}. Renew it to bring it back at the same address.` : null }
    case 'unpublished':
      return { label: 'Unpublished', tone: 'muted', hint: 'Taken offline. You can publish it again.' }
    default:
      return { label: 'Not live', tone: 'muted', hint: null }
  }
}
