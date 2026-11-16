import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../auth/authApi.js'
import { COUNTRY_CODES } from '../../config/countries.js'
import { formatAmount, priceDescription, priceParts } from '../../editor/config/plans.js'

/**
 * How prices are shown (display only; payment is always the NGN price from the server).
 *
 * - The visitor's country: what they *chose* ("Change country"), remembered on this device only
 *   (localStorage). Without a choice, the country reported by a trusted edge proxy, if the server has
 *   one configured (GET /plans/country), preselects the currency for this visit only. It is a display
 *   hint, never a verification of residence: a choice always wins, and the payment step still asks
 *   for and checks the country on the server. Browser language settings are never used.
 * - Nigeria: NGN. Another country: an estimate in its currency, converted by the server from the NGN
 *   price with its dated USD-based rates. No country: USD. No rate for that currency: NGN.
 */
export const NGN_COUNTRY = 'NG'
const STORAGE_KEY = 'mylinnnk.priceCountry'
const CHANGE_EVENT = 'mylinnnk:price-country'

export function readPriceCountry() {
  try {
    const code = window.localStorage.getItem(STORAGE_KEY)
    return code && COUNTRY_CODES.includes(code) ? code : null
  } catch {
    return null
  }
}

export function savePriceCountry(code) {
  const valid = code && COUNTRY_CODES.includes(code) ? code : null
  try {
    if (valid) window.localStorage.setItem(STORAGE_KEY, valid)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked (private mode): the choice lasts for this page only.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: valid }))
  return valid
}

/** The edge-detected country (asked once per page load; null when the server reports none or can't be reached). */
let detection = null
export function detectedCountry() {
  detection ??= apiRequest('/plans/country').then(
    (data) => (typeof data?.country === 'string' && COUNTRY_CODES.includes(data.country) ? data.country : null),
    () => null,
  )
  return detection
}
/** Tests only. */
export function resetDetectedCountry() {
  detection = null
}

/**
 * [country, choose, { detected }]: the visitor's explicit choice, or (without one) the edge-detected
 * country, or null; `detected` is true when the country came from detection. Every component using it
 * stays in step. A choice is never replaced by detection.
 */
export function usePriceCountry() {
  const [chosen, setChosen] = useState(readPriceCountry)
  const [detected, setDetected] = useState(null)
  useEffect(() => {
    const onChange = (e) => setChosen(e.detail ?? null)
    window.addEventListener(CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CHANGE_EVENT, onChange)
  }, [])
  useEffect(() => {
    if (chosen) return undefined
    let active = true
    detectedCountry().then((code) => active && setDetected(code))
    return () => {
      active = false
    }
  }, [chosen])
  const choose = useCallback((code) => setChosen(savePriceCountry(code)), [])
  return [chosen ?? detected, choose, { detected: !chosen && Boolean(detected) }]
}

/**
 * What to show for one plan. Returns:
 *   mode     'ngn' | 'estimate' (local-currency estimate) | 'fallback' (no rate for that currency: NGN)
 *   amount   the large price text ("₦2,500", "≈ ₪6.17", "≈ US$1.67")
 *   per      "one-time", "/ 30 days", …
 *   payable  the exact NGN amount payable ("₦2,500"), or null (free / custom quote)
 *   sr       a full sentence for screen readers
 */
export function displayPrice(plan, data, country) {
  const ngn = priceParts(plan, data.currency)
  const payable = plan.price && plan.price.amountMinor > 0 ? formatAmount(plan.price.amountMinor, data.currency) : null
  if (!plan.price || plan.billing === 'custom_quote') return { mode: 'ngn', ...ngn, payable: null, sr: 'Custom quotation' }
  if (country === NGN_COUNTRY) return { mode: 'ngn', ...ngn, payable, sr: priceDescription(plan, data.currency) }
  // The server converts (from the NGN price, with its dated rate) into the requested display currency.
  const local = data.estimate?.available && plan.estimate && data.estimate.currency?.code !== 'NGN' ? data.estimate.currency : null
  if (!local) return { mode: 'fallback', ...ngn, payable, sr: priceDescription(plan, data.currency) }
  const free = plan.estimate.amountMinor === 0
  const formatted = formatAmount(plan.estimate.amountMinor, local)
  return {
    mode: 'estimate',
    amount: `${free ? '' : '≈ '}${formatted}`,
    per: ngn.per,
    payable,
    sr: free ? priceDescription(plan, data.currency) : `About ${formatted} ${ngn.per}, an estimate; you pay ${payable} in NGN`,
  }
}

