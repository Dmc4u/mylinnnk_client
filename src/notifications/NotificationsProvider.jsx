import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { NotificationsContext } from './NotificationsContext.js'
import { STREAM_URL, notificationsApi } from './notificationsApi.js'

/**
 * In-app notifications for the signed-in user: one live connection per tab, shared by the bell, the
 * notifications page and (for the administrator) the payments badge.
 *
 * - Live: Server-Sent Events (EventSource) at /api/v1/notifications/stream. Every (re)connection starts
 *   with a `snapshot` that REPLACES the state, so counts always come from the server and a reconnection
 *   can never double-count. New items are merged by id (never shown twice).
 * - Fallback: if EventSource is unavailable or fails repeatedly, the summary is fetched every POLL_MS and
 *   the live connection is retried after RETRY_DELAYS_MS (3 s, 10 s, 30 s, 1 min, 2 min, then every 5 min).
 *   The short first retry matters after a server restart (deploy): the proxy answers the browser's own
 *   reconnection with an error status, which makes EventSource give up, so we reconnect ourselves.
 *   The summary is also fetched when the tab becomes visible again.
 * - Watchdog: the server sends a `ping` every 25 s. If nothing arrives for `staleMs` (default 60 s), the
 *   connection is treated as silently dead (a proxy kept it open, the laptop slept, the network changed)
 *   and is replaced at once.
 * - Marking read is optimistic (the badge updates at once) and confirmed by the server's counts.
 * - Nothing runs while signed out; the connection closes on sign-out or when the server ends the session.
 */
export const POLL_MS = 60_000
const RETRY_DELAYS_MS = Object.freeze([3_000, 10_000, 30_000, 60_000, 120_000, 300_000])
const MAX_ITEMS = 20
const MAX_FAILURES = 3
const STALE_MS = 60_000

const byNewest = (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)

function mergeItems(items, incoming) {
  const map = new Map(items.map((i) => [i.id, i]))
  for (const item of incoming) map.set(item.id, { ...map.get(item.id), ...item })
  return [...map.values()].sort(byNewest).slice(0, MAX_ITEMS)
}

const EMPTY = Object.freeze({ owner: null, unread: 0, items: [], paymentsAwaitingReview: null, connection: 'off' })

export default function NotificationsProvider({ children, eventSourceClass, staleMs = STALE_MS }) {
  const { status, user, withCsrf } = useAuth()
  const active = status === 'authenticated'
  const userId = user?.id ?? null
  // The state belongs to one signed-in user (owner): after a sign-out or a change of account the previous
  // user's notifications are never shown, without resetting state from an effect.
  const owner = active ? userId : null
  const [stored, setState] = useState(EMPTY)
  const state = owner && stored.owner === owner ? stored : EMPTY
  const disposedRef = useRef(false)

  /** Updates the current user's state (a fresh one if it belonged to someone else). */
  const update = useCallback(
    (change) =>
      setState((prev) => {
        const base = prev.owner === owner ? prev : { ...EMPTY, owner }
        const next = change(base)
        return next === base && base !== prev ? base : next
      }),
    [owner],
  )

  const applySnapshot = useCallback(
    (data) =>
      update((prev) => ({
        ...prev,
        unread: data.unread ?? 0,
        items: (data.latest ?? []).slice().sort(byNewest).slice(0, MAX_ITEMS),
        paymentsAwaitingReview: data.paymentsAwaitingReview ?? null,
      })),
    [update],
  )

  const refresh = useCallback(async () => {
    try {
      applySnapshot(await notificationsApi.summary())
    } catch {
      // Offline or signed out: the next poll, live event or sign-in brings the state back.
    }
  }, [applySnapshot])

  useEffect(() => {
    if (!owner) return undefined
    disposedRef.current = false
    const EventSourceClass = eventSourceClass ?? (typeof window !== 'undefined' ? window.EventSource : undefined)
    let source = null
    let pollTimer = null
    let retryTimer = null
    let failures = 0
    let retries = 0
    let lastMessageAt = Date.now()
    let watchdog = null
    const setConnection = (connection) => update((prev) => (prev.connection === connection ? prev : { ...prev, connection }))

    const stopPolling = () => {
      clearInterval(pollTimer)
      pollTimer = null
    }
    const startPolling = () => {
      setConnection('polling')
      refresh()
      if (!pollTimer) pollTimer = setInterval(refresh, POLL_MS)
    }
    const closeSource = () => {
      source?.close()
      source = null
    }
    const scheduleRetry = () => {
      clearTimeout(retryTimer)
      retryTimer = setTimeout(() => !disposedRef.current && connect(), RETRY_DELAYS_MS[Math.min(retries, RETRY_DELAYS_MS.length - 1)])
      retries += 1
    }
    const fallBack = () => {
      closeSource()
      startPolling()
      scheduleRetry()
    }

    function connect() {
      if (!EventSourceClass) return startPolling()
      closeSource()
      const es = new EventSourceClass(STREAM_URL, { withCredentials: true })
      source = es
      lastMessageAt = Date.now()
      const on = (name, handler) =>
        es.addEventListener(name, (event) => {
          if (source !== es) return
          lastMessageAt = Date.now()
          let data
          try {
            data = JSON.parse(event.data)
          } catch {
            return
          }
          handler(data, event)
        })
      es.addEventListener('open', () => {
        if (source !== es) return
        lastMessageAt = Date.now()
        failures = 0
        retries = 0
        stopPolling()
        setConnection('live')
      })
      on('ping', () => {})
      on('snapshot', applySnapshot)
      on('notification', (item) => update((prev) => ({ ...prev, items: mergeItems(prev.items, [item]) })))
      on('summary', (data) => update((prev) => ({ ...prev, unread: data.unread ?? prev.unread })))
      on('badge', (data) => update((prev) => ({ ...prev, paymentsAwaitingReview: data.paymentsAwaitingReview ?? prev.paymentsAwaitingReview })))
      on('end', (data) => {
        closeSource()
        // The session ended (sign-out elsewhere, password reset): stop; the auth state follows on the next request.
        if (data.reason === 'session_ended') setConnection('off')
        else fallBack()
      })
      es.onerror = () => {
        if (source !== es) return
        failures += 1
        // CLOSED (2): the server refused (e.g. 401/503); otherwise the browser is reconnecting by itself.
        if (es.readyState === 2 || failures >= MAX_FAILURES) fallBack()
      }
    }

    connect()
    // A live connection that has gone quiet for too long is replaced (pings arrive every 25 s).
    watchdog = setInterval(() => {
      if (source && source.readyState === 1 && Date.now() - lastMessageAt > staleMs) {
        closeSource()
        connect()
      }
    }, Math.max(50, Math.min(10_000, Math.round(staleMs / 4))))
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      disposedRef.current = true
      document.removeEventListener('visibilitychange', onVisible)
      clearTimeout(retryTimer)
      clearInterval(watchdog)
      stopPolling()
      closeSource()
    }
  }, [owner, eventSourceClass, staleMs, applySnapshot, refresh, update])

  const markRead = useCallback(
    async (id) => {
      let wasUnread = false
      update((prev) => {
        const items = prev.items.map((i) => {
          if (i.id !== id || i.read) return i
          wasUnread = true
          return { ...i, read: true, readAt: new Date().toISOString() }
        })
        return wasUnread ? { ...prev, items, unread: Math.max(0, prev.unread - 1) } : prev
      })
      try {
        await withCsrf((csrf) => notificationsApi.markRead(csrf, id))
      } catch (error) {
        await refresh()
        throw error
      }
    },
    [withCsrf, refresh, update],
  )

  const markAllRead = useCallback(async () => {
    update((prev) => ({ ...prev, unread: 0, items: prev.items.map((i) => (i.read ? i : { ...i, read: true, readAt: new Date().toISOString() })) }))
    try {
      await withCsrf((csrf) => notificationsApi.markAllRead(csrf))
    } catch (error) {
      await refresh()
      throw error
    }
  }, [withCsrf, refresh, update])

  const value = useMemo(() => ({ active, ...state, markRead, markAllRead, refresh }), [active, state, markRead, markAllRead, refresh])
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
