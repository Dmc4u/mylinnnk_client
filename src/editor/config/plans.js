/**
 * Publishing plans on the frontend: stable ids, hints and display helpers only.
 *
 * Prices, currencies and validity periods come from the server
 * (GET /api/v1/plans, mylinnnk_api/config/plans.js). The frontend never decides
 * what a user pays or whether they may publish, and keeps no prices of its own.
 *
 * Amounts are integers in minor units (kobo for NGN).
 */

/** Stable plan ids (server: config/plans.js). Prices apply per published page. */
export const PLAN_IDS = ['free', 'celebration', 'pro-starter', 'pro-monthly', 'pro-annual', 'special-request']

/**
 * Template category → the plan family a page would *probably* need. A UI hint
 * only; the server will apply the real eligibility rules when publishing exists.
 * Categories not listed get no suggestion.
 */
export const CATEGORY_PLAN_HINT = {
  birthdays: 'celebration',
  weddings: 'celebration',
  anniversaries: 'celebration',
  business: 'professional',
  portfolios: 'professional',
  'leadership-community': 'professional',
}

/** Guarantees shown with every plan choice (they also bind the future backend design). */
export const PUBLISHING_GUARANTEES = [
  'You can renew, or switch to another eligible plan, without losing your page content.',
  'If publishing access expires, your page goes offline but your saved drafts and content are kept.',
]

/** Publishing lifecycle states (see docs/publishing-lifecycle.md). */
export const PAGE_STATES = ['draft', 'pending_payment', 'published', 'expired', 'unpublished', 'suspended']

/** "₦2,500" from { amountMinor: 250000 } and the currency the server described. */
export function formatAmount(amountMinor, currency = { code: 'NGN', minorUnit: 100 }) {
  const major = amountMinor / currency.minorUnit
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major)
}

/** Short price line: { amount: '₦3,000', per: '/ 30 days' }. */
export function priceParts(plan, currency) {
  if (plan.billing === 'custom_quote' || !plan.price) return { amount: 'Custom quote', per: '' }
  const amount = formatAmount(plan.price.amountMinor, currency)
  if (plan.billing === 'free') return { amount, per: 'forever' }
  if (plan.billing === 'one_time') return { amount, per: 'one-time' }
  return { amount, per: `/ ${plan.validity.days} days` }
}

/** Honest one-line terms for a plan. */
export function planTerms(plan) {
  const days = plan.validity?.days
  switch (plan.billing) {
    case 'free':
      return 'Drafts only · no publishing'
    case 'one_time':
      return `Pay once · live for ${days} days · never renews`
    case 'manual_renewal':
      return `Live for ${days} days per payment · renew manually · never charged automatically`
    default:
      return 'Price and duration agreed with you'
  }
}

/** Full sentence for screen readers, e.g. "₦3,000 for 30 days, renewed manually". */
export function priceDescription(plan, currency) {
  if (plan.billing === 'custom_quote' || !plan.price) return 'Custom quotation'
  const amount = formatAmount(plan.price.amountMinor, currency)
  if (plan.billing === 'free') return `${amount}, free`
  if (plan.billing === 'one_time') return `${amount}, one-time payment for ${plan.validity.days} days`
  return `${amount} for ${plan.validity.days} days, renewed manually`
}
