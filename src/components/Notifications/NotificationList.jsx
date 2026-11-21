import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useNotifications } from '../../notifications/NotificationsContext.js'
import { notificationsApi } from '../../notifications/notificationsApi.js'
import { NotificationItem } from './NotificationBell.jsx'
import './Notifications.css'

const PAGE = 20

/**
 * The page's list with what arrived live since it loaded: new items (for the current filter) on top, and
 * read state taken from the live copy when it is newer. Derived during render; never stored twice.
 */
function withLive(items, live, filter) {
  if (!live.length) return items
  const liveById = new Map(live.map((i) => [i.id, i]))
  const known = new Set(items.map((i) => i.id))
  const newest = items[0]?.createdAt ?? ''
  const fresh = live.filter((i) => !known.has(i.id) && i.createdAt >= newest && (filter === 'all' || !i.read))
  const merged = items.map((i) => {
    const l = liveById.get(i.id)
    return l && l.read && !i.read ? { ...i, read: true, readAt: l.readAt } : i
  })
  return [...fresh, ...merged]
}

/**
 * The full notification history (customer dashboard and administration): newest first, All / Unread,
 * "Load more", mark one or all as read. New items arriving live (NotificationsProvider) are added at the
 * top without reloading; read state stays in step with the bell.
 */
export default function NotificationList() {
  const { active, items: live, unread, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [list, setList] = useState({ items: [], nextBefore: null, status: 'loading' })
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const requestRef = useRef(0)

  // The first page (again when the filter changes or after "Try again"); a late answer to an older request is ignored.
  useEffect(() => {
    if (!active) return undefined
    const request = ++requestRef.current
    notificationsApi.list({ unread: filter === 'unread', limit: PAGE }).then(
      (data) => request === requestRef.current && setList({ items: data.items, nextBefore: data.nextBefore, status: 'ready' }),
      () => request === requestRef.current && setList((prev) => ({ ...prev, status: 'error' })),
    )
    return undefined
  }, [active, filter, reloadKey])

  const loadMore = useCallback(async () => {
    const request = ++requestRef.current
    try {
      const data = await notificationsApi.list({ before: list.nextBefore, unread: filter === 'unread', limit: PAGE })
      if (request !== requestRef.current) return
      setList((prev) => ({ items: [...prev.items, ...data.items.filter((i) => !prev.items.some((p) => p.id === i.id))], nextBefore: data.nextBefore, status: 'ready' }))
    } catch {
      if (request === requestRef.current) setError('More notifications couldn’t be loaded. Please try again.')
    }
  }, [filter, list.nextBefore])

  const retry = () => {
    setList((prev) => ({ ...prev, status: 'loading' }))
    setReloadKey((k) => k + 1)
  }

  // Live arrivals at the top, and read state from the bell (or another device), merged by id.
  const items = useMemo(() => (list.status === 'ready' ? withLive(list.items, live, filter) : list.items), [list, live, filter])

  const changeFilter = (next) => {
    if (next === filter) return
    setList({ items: [], nextBefore: null, status: 'loading' })
    setFilter(next)
  }

  const open = (item, event) => {
    if (!item.read) {
      setList((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === item.id ? { ...i, read: true } : i)) }))
      markRead(item.id).catch(() => setError('This notification couldn’t be updated. Please try again.'))
    }
    if (item.link) {
      event.preventDefault()
      navigate(item.link)
    }
  }

  const readAll = async () => {
    setError(null)
    try {
      await markAllRead()
      setList((prev) => ({ ...prev, items: filter === 'unread' ? [] : prev.items.map((i) => ({ ...i, read: true })), nextBefore: filter === 'unread' ? null : prev.nextBefore }))
    } catch {
      setError('Notifications couldn’t be updated. Please try again.')
    }
  }

  return (
    <section aria-label="Notification history">
      <div className="notif-page__bar">
        <div className="notif-page__filters" role="group" aria-label="Show">
          <button type="button" className="notif-page__filter" aria-pressed={filter === 'all'} onClick={() => changeFilter('all')}>
            All
          </button>
          <button type="button" className="notif-page__filter" aria-pressed={filter === 'unread'} onClick={() => changeFilter('unread')}>
            Unread{unread > 0 ? ` (${unread})` : ''}
          </button>
        </div>
        {unread > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={readAll}>
            Mark all as read
          </button>
        )}
      </div>
      {error && (
        <p className="notif__error" role="alert">
          {error}
        </p>
      )}
      {list.status === 'loading' && items.length === 0 ? (
        <p className="notif-page__status" role="status">
          Loading notifications…
        </p>
      ) : list.status === 'error' && items.length === 0 ? (
        <p className="notif__error" role="alert">
          Notifications couldn’t be loaded. Check your connection and try again.{' '}
          <button type="button" className="notif__textbtn" onClick={retry}>
            Try again
          </button>
        </p>
      ) : items.length === 0 ? (
        <p className="notif__empty">{filter === 'unread' ? 'You have no unread notifications.' : 'You have no notifications yet.'}</p>
      ) : (
        <ul className="notif-page__list">
          {items.map((item) => (
            <li key={item.id}>
              <NotificationItem item={item} onOpen={open} />
            </li>
          ))}
        </ul>
      )}
      {list.nextBefore && (
        <div className="notif-page__more">
          <button type="button" className="btn btn--ghost btn--sm" onClick={loadMore}>
            Load more
          </button>
        </div>
      )}
    </section>
  )
}
