import Logo from '../Brand/Logo.jsx'
import SmartLink from '../SmartLink/SmartLink.jsx'
import { NAV_LINKS, SIGNUP_HREF } from '../../utils/navigation.js'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer__glow" aria-hidden="true" />
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <SmartLink to="/" className="site-footer__logo" aria-label="MyLinnnk home">
            <Logo variant="dark" size={40} />
          </SmartLink>
          <p className="site-footer__tagline">Your moments. Your story. Your page.</p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <SmartLink to={link.to}>{link.label}</SmartLink>
              </li>
            ))}
            <li>
              <SmartLink to={SIGNUP_HREF}>Get started</SmartLink>
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
