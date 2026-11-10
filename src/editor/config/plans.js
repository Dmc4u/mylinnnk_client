/**
 * Publishing plan configuration — the single place plan identifiers live.
 *
 * Prices and publishing periods are intentionally `null`: they will come from
 * the server (PublishingPlans collection) once the backend exists. The
 * frontend must never decide what a user pays or whether they may publish.
 */

export const PLAN_FAMILIES = {
  event: {
    id: 'event',
    label: 'Personal event page',
    summary: 'For birthdays, weddings, anniversaries and other celebrations.',
    billing: 'one-time',
    points: [
      'One-time publishing payment',
      'Your page stays live for a fixed publication period',
      'Renewal options to be announced',
    ],
    plans: [{ id: 'event-pass', label: 'Event publishing pass', billing: 'one_time', periodDays: null, price: null }],
  },
  professional: {
    id: 'professional',
    label: 'Professional page',
    summary: 'For businesses, portfolios, professional profiles and ongoing community pages.',
    billing: 'subscription',
    points: [
      'Monthly or annual subscription',
      'Your page stays live while the subscription is active',
      'Cancel or change plans at any time (terms to be announced)',
    ],
    plans: [
      { id: 'pro-monthly', label: 'Monthly', billing: 'subscription', interval: 'month', price: null },
      { id: 'pro-annual', label: 'Annual', billing: 'subscription', interval: 'year', price: null },
    ],
  },
}

/**
 * Category → plan family the page would *probably* need. This is a UI hint
 * only; the server will apply the real eligibility rules.
 */
export const CATEGORY_PLAN_HINT = {
  birthdays: 'event',
  weddings: 'event',
  anniversaries: 'event',
  events: 'event',
  'personal-stories': 'event',
  business: 'professional',
  portfolios: 'professional',
  'leadership-community': 'professional',
}

/** Publishing lifecycle states (see docs/publishing-lifecycle.md). */
export const PAGE_STATES = ['draft', 'pending_payment', 'published', 'expired', 'unpublished', 'suspended']
