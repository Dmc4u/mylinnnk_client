import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { badgeText, exactTime, relativeTime, useNotifications } from '../../notifications/NotificationsContext.js'
import './Notifications.css'

export function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6.5 2.5 7.5h-17C4.5 15.5 6 13.5 6 9Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </svg>
  )
}

/**
 * The notification bell (site header and admin top bar): a disclosure button with the unread count,
 * opening a panel of the latest notifications. Keyboard: Enter/Space opens; Escape closes and returns
 * focus to the bell; Tab moves through the items; leaving the panel closes it. A click outside closes it.
 * `historyPath`: the full notifications page (customer or administrator).
 */
export default function NotificationBell({ historyPath, className = '' }) {
  const { active, unread } = useNotifications()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return undefined
    panelRef.current?.focus()
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  if (!active) return null
  const label = unread ? `Notifications, ${unread} unread` : 'Notifications'

  return (
    <div
      ref={rootRef}
      className={`notif ${className}`.trim()}
      onBlur={(event) => {
        if (open && event.relatedTarget && !rootRef.current?.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button ref={buttonRef} type="button" className="notif__bell" aria-expanded={open} aria-controls={panelId} aria-label={label} onClick={() => setOpen((o) => !o)}>
        <BellIcon />
        {unread > 0 && (
          <span className="notif__badge" aria-hidden="true">
            {badgeText(unread)}
          </span>
        )}
      </button>
      {open && <NotificationPanel id={panelId} panelRef={panelRef} historyPath={historyPath} onClose={() => setOpen(false)} />}
    </div>
  )
}

/** The panel of the latest notifications (inside NotificationBell). */
export function NotificationPanel({ id, panelRef, historyPath, onClose }) {
  const { items, unread, markRead, markAllRead } = useNotifications()
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const headingId = useId()

  const open = async (item, event) => {
    if (!item.read) markRead(item.id).catch(() => setError('This notification couldn’t be updated. Please try again.'))
    if (item.link) {
      event.preventDefault()
      onClose()
      navigate(item.link)
    }
  }

  return (
    <div ref={panelRef} id={id} className="notif__panel" role="region" aria-labelledby={headingId} tabIndex={-1}>
      <div className="notif__head">
        <h2 id={headingId} className="notif__title">
          Notifications
        </h2>
        {unread > 0 && (
          <button type="button" className="notif__textbtn" onClick={() => markAllRead().catch(() => setError('Notifications couldn’t be updated. Please try again.'))}>
            Mark all as read
          </button>
        )}
      </div>
      {error && (
        <p className="notif__error" role="alert">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="notif__empty">You have no notifications yet.</p>
      ) : (
        <ul className="notif__list">
          {items.slice(0, 8).map((item) => (
            <li key={item.id}>
              <NotificationItem item={item} onOpen={open} />
            </li>
          ))}
        </ul>
      )}
      <div className="notif__foot">
        <Link to={historyPath} className="notif__all" onClick={onClose}>
          View all notifications
        </Link>
      </div>
    </div>
  )
}

/** One notification: a link when it leads somewhere, otherwise a button that marks it read. */
export function NotificationItem({ item, onOpen }) {
  const content = (
    <>
      <span className={`notif__dot${item.read ? '' : ' is-unread'}`} aria-hidden="true" />
      <span className="notif__text">
        <span className="notif__item-title">
          {!item.read && <span className="sr-only">Unread: </span>}
          {item.title}
        </span>
        {item.body && <span className="notif__item-body">{item.body}</span>}
        <time className="notif__time" dateTime={item.createdAt} title={exactTime(item.createdAt)}>
          {relativeTime(item.createdAt)}
        </time>
      </span>
    </>
  )
  const className = `notif__item${item.read ? '' : ' is-unread'}`
  return item.link ? (
    <Link to={item.link} className={className} onClick={(event) => onOpen(item, event)}>
      {content}
    </Link>
  ) : (
    <button type="button" className={className} onClick={(event) => onOpen(item, event)}>
      {content}
    </button>
  )
}
