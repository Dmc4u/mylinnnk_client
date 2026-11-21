import { useCallback, useEffect, useState } from 'react'
import { API_BASE, apiRequest } from '../auth/authApi.js'
import { formatAmount } from '../editor/config/plans.js'

export const money = (minor) => formatAmount(minor, { code: 'NGN', minorUnit: 100 })
export const when = (iso) => (iso ? new Date(iso).toLocaleString() : '—')
/** A calendar day ("YYYY-MM-DD", e.g. a transfer date) shown as that same day in every time zone. */
export const day = (value) => (value ? new Date(`${String(value).slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '—')

/**
 * Administration API client (Phase 5, Stages 3–5). The server checks on every request that the caller
 * is the designated admin (role + verified designated email); what the UI shows is only a convenience.
 */
const base = '/admin'
const post = (csrfToken, path, body = {}) => apiRequest(`${base}${path}`, { method: 'POST', body, csrfToken })

export const adminApi = {
  me: () => apiRequest(`${base}/me`),
  overview: () => apiRequest(`${base}/overview`),
  users: (q = '', page = 1) => apiRequest(`${base}/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page) })}`),
  revokeSessions: (csrfToken, id) => post(csrfToken, `/users/${id}/revoke-sessions`),
  publications: (status = '', page = 1) => apiRequest(`${base}/publications?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page) })}`),
  suspend: (csrfToken, id, reason) => post(csrfToken, `/publications/${id}/suspend`, { reason }),
  restore: (csrfToken, id) => post(csrfToken, `/publications/${id}/restore`),
  payments: (status = '') => apiRequest(`${base}/payments${status ? `?status=${status}` : ''}`),
  payment: (ref) => apiRequest(`${base}/payments/${encodeURIComponent(ref)}`),
  claim: (csrfToken, ref) => post(csrfToken, `/payments/${encodeURIComponent(ref)}/claim`),
  approve: (csrfToken, ref, body) => post(csrfToken, `/payments/${encodeURIComponent(ref)}/approve`, body),
  reject: (csrfToken, ref, reason) => post(csrfToken, `/payments/${encodeURIComponent(ref)}/reject`, { reason }),
  receiptUrl: (ref, receiptId) => `${API_BASE}${base}/payments/${encodeURIComponent(ref)}/receipts/${encodeURIComponent(receiptId)}`,
  transactions: (page = 1) => apiRequest(`${base}/transactions?page=${page}`),
  audit: (action = '', page = 1) => apiRequest(`${base}/audit?${new URLSearchParams({ ...(action ? { action } : {}), page: String(page) })}`),
  settings: () => apiRequest(`${base}/settings`),
  enquiries: ({ type = '', status = '', priority = '', q = '', page = 1 } = {}) =>
    apiRequest(`${base}/enquiries?${new URLSearchParams({ ...(type ? { type } : {}), ...(status ? { status } : {}), ...(priority ? { priority } : {}), ...(q ? { q } : {}), page: String(page) })}`),
  enquiry: (ref) => apiRequest(`${base}/enquiries/${encodeURIComponent(ref)}`),
  updateEnquiry: (csrfToken, ref, body) => apiRequest(`${base}/enquiries/${encodeURIComponent(ref)}`, { method: 'PATCH', body, csrfToken }),
  addEnquiryNote: (csrfToken, ref, text) => post(csrfToken, `/enquiries/${encodeURIComponent(ref)}/notes`, { text }),
  // requestId: one per composed reply, so a repeated request never sends it twice.
  replyToEnquiry: (csrfToken, ref, text, requestId) => post(csrfToken, `/enquiries/${encodeURIComponent(ref)}/replies`, { text, requestId }),
  // Notification monitoring (recipients masked by the server; no email content).
  deliveries: ({ state = '', type = '', from = '', to = '', page = 1 } = {}) =>
    apiRequest(`${base}/email-deliveries?${new URLSearchParams({ ...(state ? { state } : {}), ...(type ? { type } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), page: String(page) })}`),
  deliveryHealth: () => apiRequest(`${base}/email-deliveries/health`),
  retryDelivery: (csrfToken, id) => post(csrfToken, `/email-deliveries/${encodeURIComponent(id)}/retry`),
  // The administrator's own pages, without payment (the server only ever finds the admin's own pages).
  publishOwn: (csrfToken, pageId, expiry, credit) => post(csrfToken, `/my-pages/${encodeURIComponent(pageId)}/publish`, { expiry, credit }),
  updateOwnContent: (csrfToken, pageId, confirmSlug) => post(csrfToken, `/my-pages/${encodeURIComponent(pageId)}/update-content`, { confirmSlug }),
  extendOwn: (csrfToken, pageId, expiry) => post(csrfToken, `/my-pages/${encodeURIComponent(pageId)}/extend`, { expiry }),
}

/** Loads `loader()` and reloads when `deps` change → { status, data, error, reload }. */
export function useAdminData(loader, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let active = true
    loader().then(
      (data) => active && setState({ status: 'ready', data, error: null }),
      (error) => active && setState({ status: 'error', data: null, error }),
    )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  const reload = useCallback(() => setTick((n) => n + 1), [])
  return { ...state, reload }
}
