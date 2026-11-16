/**
 * Premium template expansion: every new template is valid, uses only credited CC0 sample photos,
 * has working links, a layout sequence no other template shares, readable colours, and renders
 * as a published page. The original 18 templates are kept, in their original order.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { cleanup, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TemplateRender from '../components/TemplateRender/TemplateRender.jsx'
import { TEMPLATES } from '../data/templates.js'
import * as premium from '../data/templates/premium.js'
import { createPageFromTemplate, isSafeLink, pageForRender, validatePage } from '../editor/model/page.js'
import { anchorId } from './renderMode.js'
import { fieldLabel, validateTemplate } from './schema.js'

const ORIGINAL = ['confetti-pop', 'golden-thirty', 'garden-vows', 'coastal-evening', 'twenty-years', 'paper-and-petals', 'town-hall', 'mentor-circle', 'northwind-studio', 'corner-cafe', 'frame-and-field', 'studio-mono', 'summer-sessions', 'charity-run', 'year-in-lisbon', 'letters-home', 'graduation-day', 'hello-baby']
const PREMIUM = Object.values(premium).filter((t) => t && typeof t === 'object' && t.slug)
const credits = JSON.parse(readFileSync(resolve(process.cwd(), 'public/template-media/credits.json'), 'utf8'))
const CC0 = new Set(credits.filter((c) => c.license === 'CC0').map((c) => c.file))
const templateExists = (slug) => TEMPLATES.some((t) => t.slug === slug)
const AVAILABLE = TEMPLATES.filter((t) => t.status === 'available')

/** WCAG contrast ratio of two #rrggbb colours. */
function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
const images = (value, out = []) => {
  if (Array.isArray(value)) value.forEach((v) => images(v, out))
  else if (value && typeof value === 'object') {
    if (typeof value.src === 'string') out.push(value.src)
    Object.values(value).forEach((v) => images(v, out))
  }
  return out
}
const links = (template) =>
  template.sections.flatMap((s) => [s.content.ctaHref, s.content.buttonHref, ...(s.content.items ?? []).map((i) => i.href)].filter((h) => typeof h === 'string'))

describe('premium templates', () => {
  it('the original 18 are all still there, first and in their original order', () => {
    expect(TEMPLATES.slice(0, 18).map((t) => t.slug)).toEqual(ORIGINAL)
    expect(PREMIUM.length).toBeGreaterThanOrEqual(9)
    for (const t of PREMIUM) expect(TEMPLATES).toContain(t)
  })

  it('36 templates in the agreed distribution', () => {
    const count = (id) => TEMPLATES.filter((t) => t.category === id).length
    expect(TEMPLATES).toHaveLength(36)
    expect(Object.fromEntries(['birthdays', 'weddings', 'anniversaries', 'leadership-community', 'business', 'portfolios', 'events', 'personal-stories', 'coming-soon'].map((id) => [id, count(id)]))).toEqual({
      birthdays: 6, weddings: 5, anniversaries: 4, 'leadership-community': 3, business: 5, portfolios: 5, events: 3, 'personal-stories': 3, 'coming-soon': 2,
    })
  })

  it.each(AVAILABLE.map((t) => [t.slug, t]))('%s: valid, available, and a page made from it passes the editor checks', (_, t) => {
    expect(validateTemplate(t)).toEqual([])
    expect(t.status).toBe('available')
    const result = validatePage(createPageFromTemplate(t), { templateExists })
    expect(result.ok).toBe(true)
    expect(result.page.sections).toEqual(t.sections) // nothing is silently cleaned away
  })

  it.each(TEMPLATES.map((t) => [t.slug, t]))('%s: only credited CC0 sample photos, each with a description', (_, t) => {
    const srcs = images(t.sections)
    expect(srcs.length).toBeGreaterThan(0)
    for (const src of srcs) expect(CC0.has(src), src).toBe(true)
    const withoutAlt = JSON.stringify(t.sections).match(/"src":"[^"]+","alt":""/g)
    expect(withoutAlt).toBeNull()
  })

  it.each(TEMPLATES.map((t) => [t.slug, t]))('%s: every button and menu link is safe, and #links point at a section', (_, t) => {
    const ids = new Set(t.sections.map((s) => anchorId(s.id)))
    for (const href of links(t)) {
      expect(isSafeLink(href), href).toBe(true)
      if (href.startsWith('#')) expect(ids.has(href.slice(1)), href).toBe(true)
      if (/^mailto:/.test(href) && PREMIUM.includes(t)) expect(href).toMatch(/@example\.com$/) // sample addresses only
    }
  })

  it.each(PREMIUM.map((t) => [t.slug, t]))('%s: readable colours (WCAG AA for text)', (_, t) => {
    const c = t.theme.colors
    expect(contrast(c.ink, c.bg)).toBeGreaterThanOrEqual(7)
    expect(contrast(c.muted, c.bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.surfaceInk ?? c.ink, c.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.accentInk, c.accent)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.accent, c.bg)).toBeGreaterThanOrEqual(3)
    expect(contrast(c.inverseInk ?? c.bg, c.inverseBg ?? c.ink)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['leadership-community', 'business', 'portfolios', 'events', 'personal-stories'])('%s: every template has a body layout no other template in its category uses', (category) => {
    const body = (t) => new Set(t.sections.filter((s) => !['nav', 'cta', 'contact'].includes(s.type)).map((s) => `${s.type}:${s.variant}`))
    const hero = (t) => t.sections.find((s) => s.type === 'hero')?.variant
    const group = TEMPLATES.filter((t) => t.category === category)
    for (const t of group) {
      const others = new Set(group.filter((o) => o !== t).flatMap((o) => [...body(o)]))
      expect([...body(t)].filter((layout) => !others.has(layout)).length, t.slug).toBeGreaterThan(0)
      // and no hero composition is used by more than half the category
      expect(group.filter((o) => hero(o) === hero(t)).length, t.slug).toBeLessThanOrEqual(Math.ceil(group.length / 2))
    }
  })

  it('list items may carry a photo, labelled for the layouts that show it', () => {
    expect(fieldLabel('image', 'list')).toMatch(/People cards/)
    expect(fieldLabel('image', 'hero')).toBe('Image')
  })

  it('no two templates share the same sequence of layouts', () => {
    const signature = (t) => t.sections.map((s) => `${s.type}:${s.variant}`).join(' > ')
    const seen = new Map()
    for (const t of TEMPLATES) {
      expect(seen.get(signature(t)), `${t.slug} repeats ${seen.get(signature(t))}`).toBeUndefined()
      seen.set(signature(t), t.slug)
    }
  })

  it.each(TEMPLATES.map((t) => [t.slug, t]))('%s: renders as a published page with its section anchors', (_, t) => {
    const { container } = render(<TemplateRender template={pageForRender(createPageFromTemplate(t))} mode="published" />)
    for (const s of t.sections) expect(container.querySelector(`[data-section="${s.id}"]`), s.id).not.toBeNull()
    for (const href of links(t).filter((h) => h.startsWith('#'))) expect(container.querySelector(href)).not.toBeNull()
    cleanup()
  })
})
