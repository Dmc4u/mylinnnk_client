/**
 * Share links for a published page. Every part is URL-encoded; the page address always comes from the
 * server (publication.url), never from the browser's location.
 */
export const shareText = (title) => (title ? `${title}: see my page on MyLinnnk` : 'See my page on MyLinnnk')

export const whatsappShareUrl = (url, title) => `https://wa.me/?text=${encodeURIComponent(`${shareText(title)} ${url}`)}`

export const facebookShareUrl = (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`

export const emailShareUrl = (url, title) =>
  `mailto:?subject=${encodeURIComponent(title || 'My MyLinnnk page')}&body=${encodeURIComponent(`${shareText(title)}\n\n${url}`)}`

/** The browser's own share sheet, where there is one (most phones). */
export const canShareNatively = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'
