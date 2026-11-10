import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { errorMessage } from '../../auth/messages.js'
import { authHref } from '../../auth/redirects.js'
import { useAuth } from '../../auth/useAuth.js'
import SmartLink from '../SmartLink/SmartLink.jsx'
import './AccountMenu.css'

/**
 * Auth controls for the site header, rendered as <li> items of the main nav.
 *   loading       → a placeholder of the same size (no layout jump)
 *   signed out    → "Log in" (sign-up is linked from the login page)
 *   signed in     → account menu (display name, Account, Log out)
 * The header adds the primary "Create Your Page Free" CTA after these items,
 * so it never shows more than two actions.
 */
export default function AuthNav({ onNavigate }) {
  const { status } = useAuth()
  const { pathname, search } = useLocation()

  if (status === 'loading') {
    return (
      <li className="site-nav__auth-pending" aria-hidden="true">
        <span className="auth-skeleton" />
      </li>
    )
  }

  if (status === 'authenticated') {
    return (
      <li className="site-nav__account">
        <AccountMenu onNavigate={onNavigate} />
      </li>
    )
  }

  return (
    <li className="site-nav__login">
      <SmartLink className="site-nav__link" to={authHref('login', `${pathname}${search}`)} onClick={onNavigate}>
        Log in
      </SmartLink>
    </li>
  )
}

/**
 * Disclosure-style menu (button + panel of links). Closes on Escape, on a
 * click outside and after choosing an item. On small screens the panel is
 * shown inline inside the mobile navigation instead.
 */
export function AccountMenu({ onNavigate }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const rootRef = useRef(null)
  const toggleRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    onNavigate?.()
  }

  const onLogout = async () => {
    setBusy(true)
    setError(null)
    try {
      await logout()
      close()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  const initial = (user.displayName.trim()[0] ?? '?').toUpperCase()

  return (
    <div className={`account-menu${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        ref={toggleRef}
        type="button"
        className="account-menu__toggle"
        aria-label={`Account menu for ${user.displayName}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="account-menu__avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="account-menu__name">{user.displayName}</span>
        <svg className="account-menu__chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div id={panelId} className="account-menu__panel" hidden={!open}>
        <div className="account-menu__who">
          <span className="account-menu__avatar account-menu__avatar--lg" aria-hidden="true">
            {initial}
          </span>
          <div className="account-menu__who-text">
            <p className="account-menu__who-name">{user.displayName}</p>
            <p className="account-menu__who-email" title={user.email}>
              {user.email}
            </p>
          </div>
        </div>
        {!user.emailVerified && (
          <p className="account-menu__hint">
            Please confirm your email. <Link to="/account" onClick={close}>Details</Link>
          </p>
        )}
        <ul className="account-menu__items">
          <li>
            <Link className="account-menu__item" to="/account" onClick={close}>
              Account
            </Link>
          </li>
          <li>
            <button type="button" className="account-menu__item" onClick={onLogout} disabled={busy} aria-busy={busy || undefined}>
              {busy ? 'Logging out…' : 'Log out'}
            </button>
          </li>
        </ul>
        {error && (
          <p className="account-menu__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
