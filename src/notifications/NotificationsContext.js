import { createContext, useContext } from 'react'

/** Outside a NotificationsProvider (or signed out): nothing to show, actions do nothing. */
const INACTIVE = Object.freeze({
  active: false,
  unread: 0,
  items: [],
  paymentsAwaitingReview: null,
  connection: 'off',
  markRead: async () => {},
  markAllRead: async () => {},
  refresh: async () => {},
})

export const NotificationsContext = createContext(INACTIVE)

/** The signed-in user's notifications (see NotificationsProvider). */
export const useNotifications = () => useContext(NotificationsContext)

/** The badge text: "99+" above 99. */
export const badgeText = (count) => (count > 99 ? '99+' : String(count))

/** "Just now", "5 min ago", "3 h ago", "2 days ago", then the date ("18 Nov 2026"). */
export function relativeTime(iso, now = Date.now()) {
  const then = new Date(iso).getTime()
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

/** The exact date and time, for a tooltip: "18 November 2026, 14:05". */
export const exactTime = (iso) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
