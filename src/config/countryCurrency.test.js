import { describe, expect, it } from 'vitest'
import { COUNTRY_CODES } from './countries.js'
import { COUNTRY_CURRENCY, displayCurrencyFor } from './countryCurrency.js'

describe('country → display currency', () => {
  it('maps the examples as approved, and USD when no country is chosen', () => {
    expect(displayCurrencyFor('NG')).toBe('NGN')
    expect(displayCurrencyFor('IL')).toBe('ILS')
    expect(displayCurrencyFor('US')).toBe('USD')
    expect(displayCurrencyFor('GB')).toBe('GBP')
    expect(displayCurrencyFor(null)).toBe('USD')
  })
  it('covers every country in the selector except Antarctica (no currency → NGN), with valid codes only', () => {
    expect(COUNTRY_CODES.filter((c) => !COUNTRY_CURRENCY[c])).toEqual(['AQ'])
    expect(displayCurrencyFor('AQ')).toBe('NGN')
    for (const [country, currency] of Object.entries(COUNTRY_CURRENCY)) {
      expect(COUNTRY_CODES).toContain(country)
      expect(currency).toMatch(/^[A-Z]{3}$/)
    }
    // Recent changes in use.
    expect([displayCurrencyFor('BG'), displayCurrencyFor('HR'), displayCurrencyFor('CW'), displayCurrencyFor('SL')]).toEqual(['EUR', 'EUR', 'XCG', 'SLE'])
  })
})
