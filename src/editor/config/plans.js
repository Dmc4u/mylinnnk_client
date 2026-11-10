/**
 * Publishing plan configuration — the single place plan identifiers live.
 *
 * Prices (`price`) and publication periods (`periodDays`) are intentionally
 * `null`: they are configurable and will come from the server
 * (PublishingPlans collection) once the backend exists. The frontend must
 * never decide what a user pays or whether they may publish.
 *
 * billing:
 *   'one_time'      single payment for a fixed publication period; never renews automatically
 *   'subscription'  recurring payment; renews every `interval` until cancelled
 */

export const PLAN_FAMILIES = {
  event: {
    id: 'event',
    label: 'Personal event page',
    summary: 'For birthdays, weddings, anniversaries and other celebrations.',
    points: [
      'One-time publishing payment',
      'Your page stays live for a fixed publication period',
      'No automatic renewal: renew or extend whenever you like',
    ],
    plans: [
      { id: 'event-pass', label: 'One-time pass', billing: 'one_time', autoRenew: false, periodDays: null, price: null },
    ],
  },
  professional: {
    id: 'professional',
    label: 'Professional page',
    summary: 'For businesses, portfolios, professional profiles and ongoing community pages.',
    points: [
      'Choose a one-time payment or a subscription',
      'One-time: live for a fixed period, no automatic renewal',
      'Subscriptions renew monthly or annually until cancelled',
    ],
    plans: [
      { id: 'pro-pass', label: 'One-time pass', billing: 'one_time', autoRenew: false, periodDays: null, price: null },
      { id: 'pro-monthly', label: 'Monthly', billing: 'subscription', autoRenew: true, interval: 'month', price: null },
      { id: 'pro-annual', label: 'Annual', billing: 'subscription', autoRenew: true, interval: 'year', price: null },
    ],
  },
}

/** Short, honest description of how a plan is billed and renewed. */
export function describeBilling(plan) {
  if (plan.billing === 'one_time') {
    const period = plan.periodDays ? `${plan.periodDays} days` : 'a fixed period (to be announced)'
    return `Pay once · live for ${period} · does not renew automatically`
  }
  return `Billed ${plan.interval === 'year' ? 'every year' : 'every month'} · renews automatically until cancelled`
}

/** Guarantees shown with every plan choice (they also bind the future backend design). */
export const PUBLISHING_GUARANTEES = [
  'You can renew, or switch to another eligible plan, without losing your page content.',
  'If publishing access expires, your page goes offline but your saved drafts and content are kept.',
]

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
