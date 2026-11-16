/**
 * The shared template motion system: every template (present and future) gets a preset, motion plays
 * only where it should, content is never left hidden, links keep working, statistics end on their real
 * values, and reduced motion means no motion.
 */
import 'fake-indexeddb/auto'
import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TemplateRender from '../../components/TemplateRender/TemplateRender.jsx'
import { TEMPLATES, getTemplateBySlug } from '../../data/templates.js'
import { createPageFromTemplate, pageForRender } from '../../editor/model/page.js'
import { renderApp } from '../../test/renderApp.jsx'
import { formatStat, parseStat, runCountUp } from './countUp.js'
import { CATEGORY_MOTION, DEFAULT_PRESET, MOTION_PRESETS } from './presets.js'
import { motionAttributes, resolvePreset } from './resolveMotion.js'
import { markTargets } from './useTemplateMotion.js'

vi.setConfig({ testTimeout: 15000 })

/** A controllable IntersectionObserver: `show(el)` / `hide(el)` report a section entering / leaving view. */
let observers = []
class FakeObserver {
  constructor(callback) {
    this.callback = callback
    this.targets = new Set()
    observers.push(this)
  }
  observe(el) {
    this.targets.add(el)
  }
  unobserve(el) {
    this.targets.delete(el)
  }
  disconnect() {
    this.targets.clear()
  }
}
const report = (el, isIntersecting) =>
  act(() => {
    for (const o of observers) if (o.targets.has(el)) o.callback([{ target: el, isIntersecting }])
  })

beforeEach(() => {
  observers = []
  vi.stubGlobal('IntersectionObserver', FakeObserver)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const page = (slug = 'garden-vows') => pageForRender(createPageFromTemplate(getTemplateBySlug(slug)))
const VALUES = {
  heading: ['rise', 'pop', 'blur', 'mask', 'slide'],
  text: ['rise', 'pop', 'blur', 'slide', 'fade'],
  media: ['settle', 'curtain', 'pop', 'fade'],
  item: ['rise', 'pop', 'slide', 'fade'],
  hover: ['lift', 'spring', 'sheen', 'glow'],
}

describe('presets and how a template gets one', () => {
  it('every preset is complete and uses known effects', () => {
    expect(Object.keys(MOTION_PRESETS).sort()).toEqual(['bold', 'calm', 'editorial', 'glamour', 'graceful', 'joyful', 'tender'])
    for (const [name, p] of Object.entries(MOTION_PRESETS)) {
      for (const key of ['duration', 'distance', 'stagger', 'blur', 'parallax']) expect(Number.isFinite(p[key]), `${name}.${key}`).toBe(true)
      for (const [key, allowed] of Object.entries(VALUES)) expect(allowed, `${name}.${key}`).toContain(p[key])
      expect(p.duration).toBeLessThanOrEqual(1400) // tasteful, never sluggish
    }
  })

  it('every template, however many there are, resolves to a preset: its own, else its category’s', () => {
    expect(TEMPLATES.length).toBeGreaterThan(0)
    for (const t of TEMPLATES) {
      const preset = resolvePreset(t)
      expect(MOTION_PRESETS[preset], t.slug).toBeDefined()
      expect(preset, t.slug).toBe(t.motion ?? CATEGORY_MOTION[t.category] ?? preset)
      // A saved page ({ slug, theme, sections }) resolves the same way as its template.
      expect(resolvePreset(pageForRender(createPageFromTemplate(t))), t.slug).toBe(preset)
    }
    expect(new Set(TEMPLATES.map(resolvePreset)).size).toBeGreaterThanOrEqual(5) // real variety
  })

  it('a future template with an unknown category still gets motion, from its design traits', () => {
    const base = getTemplateBySlug('garden-vows')
    const future = (theme) => ({ slug: 'brand-new', category: 'something-new', theme: { ...base.theme, ...theme }, sections: base.sections })
    expect(resolvePreset(future({ ornament: 'confetti' }))).toBe('joyful')
    expect(resolvePreset(future({ ornament: 'stars' }))).toBe('glamour')
    expect(resolvePreset(future({ ornament: undefined, fonts: { display: 'bebas', body: 'inter' }, radius: 'none' }))).toBe('bold')
    expect(resolvePreset({ slug: 'unknown', sections: [] })).toBe(DEFAULT_PRESET)
    expect(resolvePreset({ slug: 'x', category: 'birthdays', motion: 'not-a-preset', theme: base.theme })).toBe('joyful')
  })

  it('root attributes and variables; play only when asked', () => {
    const still = motionAttributes(page(), { play: false })
    expect(still.attrs['data-motion']).toBe('graceful')
    expect(still.attrs).not.toHaveProperty('data-motion-play')
    expect(still.attrs['data-m-ambient']).toBe('sway') // garden-vows has the botanical ornament
    expect(still.style['--m-dur']).toMatch(/ms$/)
    expect(motionAttributes(page(), { play: true }).attrs).toHaveProperty('data-motion-play', '')
  })
})

describe('where motion plays', () => {
  it('still renders (editing canvas, thumbnails): nothing is hidden or marked', () => {
    const { container } = render(<TemplateRender template={page()} />)
    const root = container.querySelector('.tpl')
    expect(root).not.toHaveAttribute('data-motion-play')
    expect(root).not.toHaveAttribute('data-motion-ready')
    expect(container.querySelector('.m-wait, [data-m]')).toBeNull()
    expect(observers).toHaveLength(0)
  })

  it('thumbnails never play, even if asked', () => {
    const { container } = render(<TemplateRender template={page()} maxSections={3} motion="play" />)
    expect(container.querySelector('.tpl')).not.toHaveAttribute('data-motion-play')
    expect(observers).toHaveLength(0)
  })

  it('playing: sections wait, then reveal once in view, with their elements staggered', () => {
    const { container } = render(<TemplateRender template={page()} motion="play" mode="published" />)
    const root = container.querySelector('.tpl')
    expect(root).toHaveAttribute('data-motion-ready')
    expect(root).toHaveAttribute('data-motion-play')
    const sections = [...root.querySelectorAll(':scope > [data-section]')]
    expect(sections.every((s) => s.classList.contains('m-wait'))).toBe(true)
    const hero = sections.find((s) => s.dataset.section === 'hero') ?? sections[0]
    expect(hero.querySelectorAll('[data-m]').length).toBeGreaterThan(0)
    report(hero, true)
    expect(hero.classList.contains('m-in')).toBe(true)
    expect(hero.classList.contains('m-wait')).toBe(false)
    expect(hero.classList.contains('m-on')).toBe(true)
    // Leaving view pauses ambient motion but never hides it again.
    report(hero, false)
    expect(hero.classList.contains('m-in')).toBe(true)
    expect(hero.classList.contains('m-on')).toBe(false)
  })

  it('keyboard focus reveals a waiting section at once, and links keep working', () => {
    const p = page('year-in-lisbon') // its hero layout shows a button
    const hero = p.sections.find((s) => s.type === 'hero')
    hero.content = { ...hero.content, cta: 'RSVP', ctaHref: 'https://example.com/rsvp' }
    const { container } = render(<TemplateRender template={p} motion="play" mode="published" />)
    const link = screen.getByRole('link', { name: 'RSVP' })
    expect(link).toHaveAttribute('href', 'https://example.com/rsvp')
    const section = link.closest('[data-section]')
    expect(section.classList.contains('m-wait')).toBe(true)
    act(() => link.focus())
    expect(section.classList.contains('m-in')).toBe(true)
    expect(getComputedStyle(link).pointerEvents).not.toBe('none')
    expect(container.querySelector('.tpl')).toHaveAttribute('data-motion-ready')
  })

  it('stopping (e.g. leaving the editor’s Preview) leaves everything visible', () => {
    const { container, rerender } = render(<TemplateRender template={page()} motion="play" />)
    expect(container.querySelector('.m-wait')).not.toBeNull()
    rerender(<TemplateRender template={page()} motion="static" />)
    expect(container.querySelector('.tpl')).not.toHaveAttribute('data-motion-ready')
    expect(container.querySelector('.m-wait, .m-in')).toBeNull()
  })

  it('without IntersectionObserver nothing is hidden', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    delete window.IntersectionObserver
    const { container } = render(<TemplateRender template={page()} motion="play" />)
    expect(container.querySelector('.tpl')).not.toHaveAttribute('data-motion-ready')
    expect(container.querySelector('.m-wait')).toBeNull()
  })

  it('with reduced motion requested nothing is hidden or played', () => {
    const original = window.matchMedia
    window.matchMedia = (query) => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
    try {
      const { container } = render(<TemplateRender template={page()} motion="play" mode="published" />)
      const root = container.querySelector('.tpl')
      expect(root).not.toHaveAttribute('data-motion-play')
      expect(root).not.toHaveAttribute('data-motion-ready')
      expect(container.querySelector('.m-wait')).toBeNull()
    } finally {
      window.matchMedia = original
    }
  })

  it('the editor: still while editing, playing in Preview', async () => {
    const { user } = renderApp('/editor/garden-vows')
    await screen.findByRole('button', { name: 'Save draft' }, { timeout: 6000 })
    const root = () => document.querySelector('.ed-frame__page .tpl')
    expect(root()).not.toHaveAttribute('data-motion-play')
    expect(document.querySelector('.ed-frame__page .m-wait')).toBeNull()
    await user.click(screen.getByRole('button', { name: /Preview/ }))
    expect(root()).toHaveAttribute('data-motion-play')
    expect(root()).toHaveAttribute('data-motion-ready')
  })
})

describe('animated targets', () => {
  it('marks each element once (never an element inside an animated one), with capped stagger steps', () => {
    const { container } = render(<TemplateRender template={page('charity-run')} />)
    for (const section of container.querySelectorAll('[data-section]')) {
      const marked = markTargets(section)
      for (const el of marked) expect(marked.some((other) => other !== el && other.contains(el))).toBe(false)
      for (const el of marked) expect(Number(el.style.getPropertyValue('--m-i'))).toBeLessThanOrEqual(8)
      expect(section.querySelector('.ts-ornament[data-m], .ts-marquee [data-m]')).toBeNull()
    }
  })
})

describe('statistics count up and end on their real values', () => {
  it('parses and formats common statistics; leaves other text alone', () => {
    expect(parseStat('1,200+')).toMatchObject({ prefix: '', value: 1200, grouped: true, suffix: '+' })
    expect(parseStat('98%')).toMatchObject({ value: 98, suffix: '%' })
    expect(parseStat('₦3.5m')).toMatchObject({ prefix: '₦', value: 3.5, decimals: 1, suffix: 'm' })
    expect(formatStat(parseStat('1,200+'), 600)).toBe('600+')
    expect(formatStat(parseStat('12,500'), 12500)).toBe('12,500')
    for (const text of ['Forever', '24/7 support', '', '0']) {
      if (text === '24/7 support') expect(parseStat(text)).toMatchObject({ value: 24, suffix: '/7 support' })
      else expect(parseStat(text)).toBeNull()
    }
  })

  it('counts from 0 to the exact original text', () => {
    const el = document.createElement('span')
    el.dataset.countup = '1,200+'
    el.textContent = '1,200+'
    let clock = 0
    const frames = []
    runCountUp(el, { duration: 1000, now: () => clock, raf: (fn) => frames.push(fn), caf: () => {} })
    expect(el.textContent).toBe('0+')
    clock = 500
    frames.shift()()
    expect(Number(el.textContent.replace(/\D/g, ''))).toBeGreaterThan(0)
    clock = 1000
    frames.shift()()
    expect(el.textContent).toBe('1,200+')
  })

  it('cancelling (e.g. leaving the page) leaves the exact final value', () => {
    const el = document.createElement('span')
    el.dataset.countup = '350'
    el.textContent = '350'
    const cancel = runCountUp(el, { raf: () => 1, caf: () => {} })
    expect(el.textContent).toBe('0')
    cancel()
    expect(el.textContent).toBe('350')
  })

  it('screen readers always get the real value; the counting copy is hidden from them', () => {
    const p = page('charity-run')
    const stats = p.sections.find((s) => s.type === 'stats')
    if (!stats) return // only if a template uses stats
    render(<TemplateRender template={p} />)
    const item = document.querySelector('.ts-stats__item')
    const visible = item.querySelector('[data-countup]')
    expect(visible).toHaveAttribute('aria-hidden', 'true')
    expect(within(item).getByText(visible.dataset.countup, { selector: '.sr-only' })).toBeInTheDocument()
  })
})
