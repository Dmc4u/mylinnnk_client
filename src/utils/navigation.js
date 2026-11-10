/** "Use This Template" opens the visual editor with a fresh copy of the template. */
export const getUseTemplateHref = (slug) => `/editor/${slug}`

/**
 * Where every "Create Your Page Free" button points. Sign-up isn't built yet,
 * so it scrolls to the homepage's closing call-to-action; change it here once
 * it exists.
 */
export const SIGNUP_HREF = '/#get-started'

export const templatePreviewPath = (slug) => `/templates/${slug}`

/** Main navigation. `to` is a React Router location (route or /#section). */
export const NAV_LINKS = [
  { to: '/templates', label: 'Templates' },
  { to: '/#features', label: 'Features' },
  { to: '/#moments', label: 'Moments' },
  { to: '/#how', label: 'How it works' },
]
