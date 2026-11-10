/**
 * Where every "Create Your Page Free" button points. Sign-up isn't built yet,
 * so it scrolls to the homepage's closing call-to-action; change it here once
 * it exists.
 */
export const SIGNUP_HREF = '/#get-started'

/**
 * Destination for "Use This Template". The editor isn't built yet, so this
 * falls back to the sign-up placeholder. When the editor exists, return its
 * route instead — callers already pass the template slug:
 *   export const getUseTemplateHref = (slug) => `/editor/new?template=${slug}`
 */
export const getUseTemplateHref = () => SIGNUP_HREF

export const templatePreviewPath = (slug) => `/templates/${slug}`

/** Main navigation. `to` is a React Router location (route or /#section). */
export const NAV_LINKS = [
  { to: '/templates', label: 'Templates' },
  { to: '/#features', label: 'Features' },
  { to: '/#moments', label: 'Moments' },
  { to: '/#how', label: 'How it works' },
]
