import { API_BASE, apiRequest } from '../auth/authApi.js'

/**
 * Customer publishing and manual bank-transfer payments (Phase 5, Stages 4–5).
 * Amounts, statuses and approval are decided by the server; these calls only
 * choose an address and a plan, describe a transfer and upload evidence.
 */
const json = (method, path, csrfToken, body = {}) => apiRequest(path, { method, body, csrfToken })

export const publishingApi = {
  getPublication: (pageId) => apiRequest(`/pages/${pageId}/publication`),
  /** → { publications: [...], site: { origin, local } }: the account's paid-for pages with their real address and state. */
  listPublications: () => apiRequest('/publications'),
  slugAvailability: (slug) => apiRequest(`/publications/slug-availability?slug=${encodeURIComponent(slug)}`),
  reserveSlug: (csrfToken, pageId, slug) => json('PUT', `/pages/${pageId}/publication/slug`, csrfToken, { slug }),
  /**
   * Publishing or renewal order. `country` (ISO 3166-1 alpha-2) is the customer's answer to
   * "What is your country?"; the API refuses countries where payment isn't offered
   * (403 PAYMENT_NOT_AVAILABLE_IN_COUNTRY) without saying which ones are.
   */
  createOrder: (csrfToken, pageId, planId, country) => json('POST', `/pages/${pageId}/orders`, csrfToken, { planId, country }),
  listOrders: () => apiRequest('/orders'),
  getOrder: (reference) => apiRequest(`/orders/${encodeURIComponent(reference)}`),
  submitPayment: (csrfToken, reference, { payerName, transferDate, note }) => json('POST', `/orders/${encodeURIComponent(reference)}/submit`, csrfToken, { payerName, transferDate, note }),
  cancelOrder: (csrfToken, reference) => json('POST', `/orders/${encodeURIComponent(reference)}/cancel`, csrfToken),
  // "Try again" after an order expired: a new order (new reference, fresh deadline) for the same page and plan.
  retryOrder: (csrfToken, reference) => json('POST', `/orders/${encodeURIComponent(reference)}/retry`, csrfToken),
  uploadReceipt: (csrfToken, reference, file) =>
    apiRequest(`/orders/${encodeURIComponent(reference)}/receipts`, { method: 'PUT', rawBody: file, contentType: file.type, csrfToken }),
  receiptUrl: (reference, receiptId) => `${API_BASE}/orders/${encodeURIComponent(reference)}/receipts/${encodeURIComponent(receiptId)}`,
}

export const ORDER_STATUS_LABELS = {
  created: 'Saved',
  awaiting_transfer: 'Waiting for your transfer',
  submitted: 'Payment Under Review',
  under_review: 'Payment Under Review',
  approved: 'Payment confirmed', // whether the page is live comes from its publication, not the order
  rejected: 'Needs attention',
  expired: 'Expired',
  cancelled: 'Cancelled',
}

/** Receipts are screenshots or photos only (the server refuses PDFs until it can sanitise them). */
export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp'

/**
 * Today's date as the customer's own calendar shows it ("YYYY-MM-DD"). A transfer date is a day,
 * not a moment: it is sent exactly like this, with no time added (a made-up time such as noon could
 * lie in the future for a transfer made this morning).
 */
export function localToday(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Answers after which the order must be shown again as the server now has it. */
export const RELOAD_ORDER_CODES = Object.freeze(['ORDER_EXPIRED', 'PAYMENT_MODE_CHANGED', 'ORDER_STATE_CHANGED', 'PAYMENTS_NOT_AVAILABLE'])
