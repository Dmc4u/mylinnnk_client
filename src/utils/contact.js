/**
 * How customers reach MyLinnnk: the Contact and Request a Quote pages (which send to the support
 * inbox through the API), and the support address itself.
 */
export const SUPPORT_EMAIL = 'support@dmclimited.net'

export const CONTACT_PATH = '/contact'
export const QUOTE_PATH = '/request-quote'

/** "Contact Us". */
export const contactHref = () => CONTACT_PATH

/**
 * "Request a Quote", keeping what the customer was looking at: the plan id, the page address and the
 * country they chose (ISO code). The form shows these and sends them with the request.
 */
export function quoteRequestHref({ planId, pageAddress, country } = {}) {
  const params = new URLSearchParams()
  if (planId) params.set('plan', planId)
  if (pageAddress) params.set('page', pageAddress)
  if (country) params.set('country', country)
  const query = params.toString()
  return query ? `${QUOTE_PATH}?${query}` : QUOTE_PATH
}
