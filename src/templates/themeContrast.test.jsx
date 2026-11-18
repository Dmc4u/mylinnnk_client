/**
 * Readability (WCAG AA) of every template's default colours, and the readability guards that draw
 * any page (older pages, user choices) with readable shades without changing its saved theme.
 */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TemplateRender from '../components/TemplateRender/TemplateRender.jsx'
import { TEMPLATES, getTemplateBySlug } from '../data/templates.js'
import { contrastRatio, deepenToContrast } from '../editor/model/contrast.js'
import { accentCustomised, contrastBetween, readableColors, readableShade, themeToStyle } from './theme.js'

const AA = 4.5
const LARGE = 3

describe('template colours (default themes)', () => {
  for (const t of TEMPLATES) {
    it(`${t.slug}: text pairs meet WCAG AA, and the page is drawn with its own colours`, () => {
      const c = t.theme.colors
      const surfaceInk = c.surfaceInk ?? c.ink
      const inverseBg = c.inverseBg ?? c.ink
      const inverseInk = c.inverseInk ?? c.bg
      const pairs = [
        ['ink on page', c.ink, c.bg, AA],
        ['secondary text on page', c.muted, c.bg, AA],
        ['card text', surfaceInk, c.surface, AA],
        ['button text on primary', c.accentInk, c.accent, AA],
        ['text on inverse sections', inverseInk, inverseBg, AA],
        ['primary colour as text on page', c.accent, c.bg, AA],
      ]
      for (const [label, fg, bg, min] of pairs) {
        expect(contrastBetween(fg, bg), `${t.slug}: ${label} (${fg} on ${bg})`).toBeGreaterThanOrEqual(min)
      }
      // A readable default theme is drawn exactly as designed: no guard changes its main colours.
      const style = themeToStyle(t.theme)
      expect(style['--t-ink']).toBe(c.ink)
      expect(style['--t-muted']).toBe(c.muted)
      expect(style['--t-accent']).toBe(c.accent)
      expect(style['--t-accent-ink']).toBe(c.accentInk)
      expect(style['--t-accent-on-bg']).toBe(c.accent)
      expect(contrastBetween(style['--t-accent-on-surface'], c.surface)).toBeGreaterThanOrEqual(AA)
      expect(contrastBetween(style['--t-accent-on-inverse'], inverseBg)).toBeGreaterThanOrEqual(LARGE)
    })
  }
})

describe('older pages: readable shades without changing the saved theme', () => {
  // Template defaults before the November 2026 contrast fixes, as saved in existing drafts and snapshots.
  const OLD = {
    'confetti-pop': { accent: '#ff4f86' },
    'charity-run': { accent: '#16a34a' },
    'coastal-evening': { accent: '#e0794f' },
    'hello-baby': { accent: '#2a9d8f', muted: '#61807f' },
    'paper-and-petals': { accent: '#c9785f', muted: '#8f746a' },
    'garden-vows': { accent: '#7b8c62', muted: '#6f7a68' },
  }

  for (const [slug, old] of Object.entries(OLD)) {
    it(`${slug}: an old saved theme is drawn readably, in shades of its own colours`, () => {
      const theme = structuredClone(getTemplateBySlug(slug).theme)
      Object.assign(theme.colors, old)
      const saved = structuredClone(theme)
      const style = themeToStyle(theme)
      const c = theme.colors
      expect(theme).toEqual(saved) // nothing saved is touched
      expect(style['--t-accent']).toBe(old.accent) // fills (buttons, accent sections) keep the brand colour
      expect(contrastBetween(style['--t-accent-on-bg'], c.bg)).toBeGreaterThanOrEqual(AA)
      expect(contrastBetween(style['--t-accent-on-surface'], c.surface)).toBeGreaterThanOrEqual(AA)
      expect(contrastBetween(style['--t-accent-ink'], c.accent)).toBeGreaterThanOrEqual(AA)
      expect(contrastBetween(style['--t-muted'], c.bg)).toBeGreaterThanOrEqual(AA)
      // same hue family: the accent text shade is a darker version, not black
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(style['--t-accent-on-bg'].slice(i, i + 2), 16))
      const [r0, g0, b0] = [1, 3, 5].map((i) => parseInt(old.accent.slice(i, i + 2), 16))
      expect(Math.sign(r - g)).toBe(Math.sign(r0 - g0))
      expect(Math.sign(g - b)).toBe(Math.sign(g0 - b0))
    })
  }

  it('readableShade keeps a readable colour, and leaves colours it cannot read alone', () => {
    expect(readableShade('#123d2f', ['#fbf7ec'])).toBe('#123d2f')
    expect(readableShade('hsl(30 100% 60%)', ['#ffffff'])).toBe('hsl(30 100% 60%)')
    expect(contrastBetween(readableShade('#c6ff3d', ['#f7f7fb']), '#f7f7fb')).toBeGreaterThanOrEqual(AA)
  })

  it('secondary text on a dark page with light cards keeps its page shade (never turns white)', () => {
    const c = { bg: '#0a0a14', surface: '#f7f7fb', ink: '#f7f7fb', muted: '#a6a6c4', accent: '#c6ff3d', accentInk: '#0a0a14' }
    expect(readableColors(c).muted).toBe('#a6a6c4')
  })
})

describe('theme-derived layout colours', () => {
  const base = { bg: '#10131a', surface: '#1a1f2b', ink: '#fff7e8', muted: '#c4b9a3', accent: '#ffb547', accentInk: '#10131a' }

  it('the poster keeps the inverse colours unless the accent disappears on them', () => {
    expect(readableColors({ ...base, inverseBg: '#ffb547', inverseInk: '#10131a' })).toMatchObject({ posterBg: '#10131a', posterInk: '#fff7e8' })
    expect(readableColors({ ...base, inverseBg: '#0a0a14', inverseInk: '#f7f7fb' })).toMatchObject({ posterBg: '#0a0a14', posterInk: '#f7f7fb' })
  })

  it('the photo overlay is the inverse background when dark, otherwise the darkest theme colour', () => {
    expect(readableColors({ ...base, inverseBg: '#0f2c3d', inverseInk: '#ffffff' }).scrim).toBe('#0f2c3d')
    expect(readableColors({ ...base, bg: '#0b0a14', ink: '#f4f1ff', inverseBg: '#f4f1ff', inverseInk: '#0b0a14' }).scrim).toBe('#0b0a14')
  })

  it('colours it cannot parse keep the previous behaviour', () => {
    const style = themeToStyle({ colors: { ...base, accent: 'hsl(30 100% 60%)', inverseBg: 'hsl(30 100% 60%)' }, fonts: {} })
    expect(style['--t-accent-on-inverse']).toBe('hsl(30 100% 60%)')
    expect(style['--t-poster-bg']).toBe('hsl(30 100% 60%)')
  })
})

describe('Golden Jubilee lettering', () => {
  const page = (accent) => {
    const t = structuredClone(getTemplateBySlug('golden-jubilee'))
    if (accent) t.theme.colors.accent = accent
    return t
  }

  it('keeps the gold for the accents it has shipped with (existing and new pages)', () => {
    for (const accent of [null, '#8a6416', '#876216', '#8A6416']) {
      const { container, unmount } = render(<TemplateRender template={page(accent)} maxSections={1} />)
      expect(container.querySelector('.tpl').classList.contains('tpl--accent-custom')).toBe(false)
      unmount()
    }
  })

  it('follows an accent the owner chose; other templates never get the flag', () => {
    const { container } = render(<TemplateRender template={page('#1d4ed8')} maxSections={1} />)
    expect(container.querySelector('.tpl').classList.contains('tpl--accent-custom')).toBe(true)
    expect(accentCustomised('confetti-pop', { accent: '#000000' })).toBe(false)
  })
})

describe('editor: fixing the primary colour keeps its hue', () => {
  it('deepens a light accent just enough on a light page, and lightens one on a dark page', () => {
    const fixed = deepenToContrast('#ff4f86', '#fff8ee')
    expect(contrastRatio(fixed, '#fff8ee')).toBeGreaterThanOrEqual(4.5)
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(fixed.slice(i, i + 2), 16))
    expect(r).toBeGreaterThan(g)
    expect(r).toBeGreaterThan(b)
    expect(contrastRatio(deepenToContrast('#1d4ed8', '#0b0f14'), '#0b0f14')).toBeGreaterThanOrEqual(4.5)
    expect(deepenToContrast('#123d2f', '#fbf7ec')).toBe('#123d2f')
  })
})
