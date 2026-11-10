import Logo from '../Brand/Logo.jsx'
import { NAV_LINKS } from '../../utils/navigation.js'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer__glow" aria-hidden="true" />
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <a href="#top" className="site-footer__logo" aria-label="MyLinnnk home">
            <Logo variant="dark" size={40} />
          </a>
          <p className="site-footer__tagline">Your moments. Your story. Your page.</p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
            <li>
              <a href="#get-started">Get started</a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="container site-footer__bottom">
        <p>© {year} MyLinnnk. All rights reserved.</p>
      </div>
    </footer>
  )
}
