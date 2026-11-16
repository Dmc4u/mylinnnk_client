import { useCallback, useEffect, useState } from 'react'
import { publishingApi } from '../../services/publishingApi.js'

/**
 * The customer dashboard's data: the account's publications (GET /publications) and orders
 * (GET /orders), both owner-only on the server. Counts, reminders and actions are derived from what the
 * server returns (its dates and states); nothing is invented or stored here.
 */
const DAY = 24 * 60 * 60 * 1000
/** Live pages ending within this many days get a renewal reminder. */
export const REMINDER_DAYS = 14
/** Orders a customer is still in the middle of (one per page at a time, on the server). */
export const OPEN_ORDER_STATES = Object.freeze(['awaiting_transfer', 'submitted', 'under_review', 'rejected'])

export const daysUntil = (iso, now = Date.now()) => (iso ? Math.ceil((new Date(iso).getTime() - now) / DAY) : null)

const openOrderFor = (pub, orders) => orders.find((o) => o.pageId === pub.pageId && OPEN_ORDER_STATES.includes(o.status)) ?? null

/**
 * What a published page can do next, never offering an action the server would refuse:
 *   { canRenew, renewLabel, reason, orderRef }
 * reason: 'suspended' | 'payment' (paying to publish) | 'renewal_in_progress' | 'deleted' | 'scheduled' | null
 */
export function publicationAction(pub, orders = []) {
  if (pub.suspended) return { canRenew: false, reason: 'suspended', orderRef: null }
  if (pub.pageDeleted) return { canRenew: false, reason: 'deleted', orderRef: null }
  if (['pending_payment', 'pending_review'].includes(pub.effectiveStatus)) return { canRenew: false, reason: 'payment', orderRef: openOrderFor(pub, orders)?.reference ?? pub.orderRef ?? null }
  const open = openOrderFor(pub, orders)
  if (open) return { canRenew: false, reason: 'renewal_in_progress', orderRef: open.reference }
  if (pub.effectiveStatus === 'scheduled') return { canRenew: false, reason: 'scheduled', orderRef: null }
  // The administrator's complimentary pages are managed (updated, extended) without payment.
  if (pub.complimentary && ['active', 'grace', 'expired'].includes(pub.effectiveStatus)) return { canRenew: true, renewLabel: 'Manage', reason: null, orderRef: null }
  if (pub.publiclyVisible || ['active', 'grace', 'expired'].includes(pub.effectiveStatus)) return { canRenew: true, renewLabel: 'Renew', reason: null, orderRef: null }
  if (pub.effectiveStatus === 'unpublished') return { canRenew: true, renewLabel: 'Publish again', reason: null, orderRef: null }
  return { canRenew: false, reason: null, orderRef: null }
}

/** Pages to remind about: live pages ending within REMINDER_DAYS, and expired ones (never suspended ones). */
export function renewalReminders(publications = [], orders = [], now = Date.now()) {
  const out = []
  for (const pub of publications) {
    if (pub.suspended || pub.pageDeleted) continue
    const daysLeft = daysUntil(pub.expiresAt, now)
    const live = pub.publiclyVisible && pub.effectiveStatus === 'active'
    if (live && daysLeft !== null && daysLeft <= REMINDER_DAYS) out.push({ pub, daysLeft: Math.max(0, daysLeft), state: 'expiring', action: publicationAction(pub, orders) })
    else if (['grace', 'expired'].includes(pub.effectiveStatus)) out.push({ pub, daysLeft: 0, state: 'expired', action: publicationAction(pub, orders) })
  }
  return out.sort((a, b) => (a.state === b.state ? a.daysLeft - b.daysLeft : a.state === 'expired' ? -1 : 1))
}

/** The overview numbers (null while a source hasn't loaded, so nothing is guessed). */
export function dashboardCounts({ drafts = null, publications = null, now = Date.now() }) {
  return {
    drafts: drafts ? drafts.length : null,
    published: publications ? publications.length : null,
    live: publications ? publications.filter((p) => p.publiclyVisible && !p.suspended).length : null,
    attention: publications ? publications.filter((p) => p.suspended || ['grace', 'expired'].includes(p.effectiveStatus)).length : null,
    expiringSoon: publications ? publications.filter((p) => p.publiclyVisible && !p.suspended && (daysUntil(p.expiresAt, now) ?? Infinity) <= REMINDER_DAYS).length : null,
  }
}

/** Loads the account's publications and orders together. */
export function useDashboardData() {
  const [state, setState] = useState({ phase: 'loading', publications: [], orders: [], site: null })
  const load = useCallback(async () => {
    const [pubs, orders] = await Promise.allSettled([publishingApi.listPublications(), publishingApi.listOrders()])
    setState({
      phase: pubs.status === 'fulfilled' && orders.status === 'fulfilled' ? 'ready' : 'error',
      publications: pubs.status === 'fulfilled' ? (pubs.value.publications ?? []) : [],
      site: pubs.status === 'fulfilled' ? (pubs.value.site ?? null) : null,
      orders: orders.status === 'fulfilled' ? (orders.value.orders ?? []) : [],
      publicationsLoaded: pubs.status === 'fulfilled',
      ordersLoaded: orders.status === 'fulfilled',
    })
  }, [])
  useEffect(() => {
    queueMicrotask(load)
  }, [load])
  return { ...state, reload: load }
}
