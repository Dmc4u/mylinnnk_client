import { API_BASE, apiRequest } from '../auth/authApi.js'

/**
 * Client for /api/v1/notifications (the signed-in user's in-app notifications). Every call uses the
 * session cookie; changes also send the session's CSRF token. The live stream is opened with
 * EventSource at STREAM_URL (NotificationsProvider).
 */
export const STREAM_URL = `${API_BASE}/notifications/stream`

export const notificationsApi = {
  summary: () => apiRequest('/notifications/summary'),
  list: ({ before, unread, limit } = {}) => {
    const params = new URLSearchParams()
    if (before) params.set('before', before)
    if (unread) params.set('unread', 'true')
    if (limit) params.set('limit', String(limit))
    const query = params.toString()
    return apiRequest(`/notifications${query ? `?${query}` : ''}`)
  },
  markRead: (csrfToken, id) => apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', body: {}, csrfToken }),
  markAllRead: (csrfToken) => apiRequest('/notifications/read-all', { method: 'POST', body: {}, csrfToken }),
}
