/** "Use This Template" opens the visual editor with a fresh copy of the template. */
export const getUseTemplateHref = (slug) => `/editor/${slug}`

/**
 * Where every "Create Your Page Free" button points: the homepage's
 * get-started section, which leads into the templates. Creating a page never
 * requires an account (sign-up has its own link: /signup).
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
