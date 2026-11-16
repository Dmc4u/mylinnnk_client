import { describe, expect, it } from 'vitest'
import { COUNTRY_CODES, countryOptions, filterCountries, foldText } from './countries.js'
import { SUPPORT_EMAIL, contactHref, quoteRequestHref } from '../utils/contact.js'

describe('country picker data', () => {
  it('lists all 249 ISO 3166-1 alpha-2 countries, each with a real name, sorted by name', () => {
    const options = countryOptions()
    expect(COUNTRY_CODES).toHaveLength(249)
    expect(new Set(COUNTRY_CODES).size).toBe(249)
    expect(options).toHaveLength(249)
    for (const o of options) expect(o.name).not.toBe(o.code)
    const names = options.map((o) => o.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')))
  })

  it('finds countries by name, code, other names and without accents', () => {
    const options = countryOptions()
    const codes = (q) => filterCountries(options, q).map((o) => o.code)
    expect(codes('nigeria')).toEqual(['NG'])
    expect(codes('GH')).toContain('GH')
    expect(codes('usa')).toEqual(['US'])
    expect(codes('united king')).toEqual(['GB'])
    expect(codes('cote')).toEqual(['CI'])
    expect(codes('  ')).toHaveLength(249)
    expect(codes('no such place')).toEqual([])
    expect(foldText('  Åland ')).toBe('aland')
  })

  it('knows nothing about where payment is offered', () => {
    for (const o of countryOptions()) expect(Object.keys(o).sort()).toEqual(['code', 'name', 'search'])
  })
})

describe('contact links', () => {
  it('go to the Contact and Request a Quote pages, the quote carrying what the customer chose', () => {
    expect(SUPPORT_EMAIL).toBe('support@dmclimited.net')
    expect(contactHref()).toBe('/contact')
    const quote = new URL(quoteRequestHref({ planId: 'celebration', pageAddress: 'mylinnnk.com/p/ada', country: 'GH' }), 'http://localhost')
    expect(quote.pathname).toBe('/request-quote')
    expect(Object.fromEntries(quote.searchParams)).toEqual({ plan: 'celebration', page: 'mylinnnk.com/p/ada', country: 'GH' })
    expect(quoteRequestHref()).toBe('/request-quote')
  })
})
