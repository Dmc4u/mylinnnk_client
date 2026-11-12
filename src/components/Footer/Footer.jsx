import Logo from '../Brand/Logo.jsx'
import SmartLink from '../SmartLink/SmartLink.jsx'
import { FOOTER_LINK_GROUPS } from '../../utils/navigation.js'
import './Footer.css'

/**
 * Site footer (every page except the editor).
 * `continuous`: on the homepage the footer continues the closing
 * "Ready to tell your story?" section above it (same background, rings and
 * light), so the two read as one; elsewhere it stands on its own.
 */
export default function Footer({ continuous = false }) {
  const year = new Date().getFullYear()

  return (
    <footer className={`site-footer${continuous ? ' site-footer--continuous' : ''}`}>
      <div className="site-footer__bg" aria-hidden="true" />
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <SmartLink to="/" className="site-footer__logo" aria-label="MyLinnnk home">
            <Logo variant="dark" size={40} />
          </SmartLink>
          <p className="site-footer__tagline">Your moments. Your story. Your page.</p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer">
          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title} className="site-footer__group">
              <h2 className="site-footer__heading" id={`footer-${group.title.toLowerCase()}`}>
                {group.title}
              </h2>
              <ul aria-labelledby={`footer-${group.title.toLowerCase()}`}>
                {group.links.map((link) => (
                  <li key={link.to}>
                    <SmartLink to={link.to}>{link.label}</SmartLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="container site-footer__bottom">
        <p>© {year} MyLinnnk. All rights reserved.</p>
      </div>
    </footer>
  )
}
