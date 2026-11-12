import { useEffect, useState } from 'react'
import AuthNav from '../AccountMenu/AccountMenu.jsx'
import Logo from '../Brand/Logo.jsx'
import Button from '../Button/Button.jsx'
import SmartLink from '../SmartLink/SmartLink.jsx'
import { CREATE_PAGE_HREF, HEADER_LINKS } from '../../utils/navigation.js'
import './Header.css'

export default function Header() {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 8)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''} ${menuOpen ? 'is-open' : ''}`}>
      <div className="site-header__inner container">
        <SmartLink to="/" className="site-header__brand" aria-label="MyLinnnk home" onClick={closeMenu}>
          <Logo size={34} />
        </SmartLink>

        <nav className="site-nav" aria-label="Main">
          <ul id="site-nav-list" className="site-nav__list">
            {HEADER_LINKS.map((link) => (
              <li key={link.to}>
                <SmartLink className="site-nav__link" to={link.to} onClick={closeMenu}>
                  {link.label}
                </SmartLink>
              </li>
            ))}
            <AuthNav onNavigate={closeMenu} />
            {/* Primary CTA in every auth state: creating a page never needs an account. */}
            <li className="site-nav__cta">
              <Button to={CREATE_PAGE_HREF} size="sm" onClick={closeMenu}>
                Create Your Page Free
              </Button>
            </li>
          </ul>
        </nav>

        <button
          type="button"
          className="site-header__toggle"
          aria-expanded={menuOpen}
          aria-controls="site-nav-list"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          <span className="site-header__toggle-bar" aria-hidden="true" />
          <span className="site-header__toggle-bar" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
