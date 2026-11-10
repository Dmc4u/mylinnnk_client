import { Link, NavLink, useLocation } from 'react-router'

/**
 * Router link that also handles in-page targets:
 * - "/templates" style routes use NavLink, so the current page gets aria-current="page".
 * - "/#section" links use Link (no active state, since they share the home route).
 * - Clicking a link to where you already are scrolls to the section (or top)
 *   instead of doing nothing.
 */
export default function SmartLink({ to, onClick, children, ...rest }) {
  const location = useLocation()
  const [targetPath, targetHash = ''] = to.split('#')
  const isSection = to.includes('#')

  const handleClick = (event) => {
    onClick?.(event)
    const samePath = (targetPath || '/') === location.pathname
    const sameHash = (targetHash ? `#${targetHash}` : '') === location.hash
    if (samePath && sameHash) {
      event.preventDefault()
      const target = targetHash ? document.getElementById(targetHash) : null
      if (target) target.scrollIntoView()
      else window.scrollTo({ top: 0 })
    }
  }

  const Component = isSection ? Link : NavLink
  return (
    <Component to={to} onClick={handleClick} {...rest}>
      {children}
    </Component>
  )
}
