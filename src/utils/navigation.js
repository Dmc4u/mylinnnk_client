/** "Use This Template" opens the visual editor with a fresh copy of the template. */
export const getUseTemplateHref = (slug) => `/editor/${slug}`

/**
 * Where every "Create Your Page Free" button points: straight to the template
 * gallery (choose a template → editor). Creating a page never requires an
 * account (sign-up has its own link: /signup).
 */
export const CREATE_PAGE_HREF = '/templates'

/** The homepage's "Ready to tell your story?" section (footer "Get started" link). */
export const GET_STARTED_HREF = '/#get-started'

export const templatePreviewPath = (slug) => `/templates/${slug}`

/**
 * Main header navigation (desktop and mobile menu): real pages only.
 * `to` is a React Router location (route or /#section).
 */
export const HEADER_LINKS = [
  { to: '/templates', label: 'Templates' },
  { to: '/pricing', label: 'Pricing' },
]

/**
 * Footer navigation, in groups. Homepage sections (/#…) live here rather than in
 * the header; SmartLink + ScrollManager scroll to them from any route.
 */
export const FOOTER_LINK_GROUPS = [
  {
    title: 'Create',
    links: [
      { to: '/templates', label: 'Templates' },
      { to: '/pricing', label: 'Pricing' },
      { to: GET_STARTED_HREF, label: 'Get started' },
    ],
  },
  {
    title: 'Discover',
    links: [
      { to: '/#features', label: 'Features' },
      { to: '/#moments', label: 'Moments' },
      { to: '/#how', label: 'How it works' },
    ],
  },
]
