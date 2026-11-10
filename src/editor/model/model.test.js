/**
 * Editor model checks from Phase 3 (previously run as a standalone script),
 * now part of `npm test`.
 */
import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../../data/templates.js'
import { validateTemplate } from '../../templates/schema.js'
import * as ops from './operations.js'
import { collectMediaIds, createPageFromTemplate, resolvePageMedia, validatePage } from './page.js'
import { addableTypes } from './sectionLibrary.js'

const templateExists = (slug) => TEMPLATES.some((t) => t.slug === slug && t.status === 'available')
const canon = (v) =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v

function buildEditedPage() {
  const tpl = TEMPLATES.find((t) => t.slug === 'garden-vows')
  let page = createPageFromTemplate(tpl)
  page = ops.setContent(page, 'hero', ['title'], 'Ana & Rui')
  page = ops.setTheme(page, ['colors', 'accent'], '#123456')
  const { page: p2 } = ops.addSection(page, 'quote', 'hero', 'sec_testquote0001')
  const { page: p3 } = ops.duplicateSection(p2, 'story', 'sec_copy000000001')
  const p4 = ops.moveSection(p3, 'gallery', -1)
  const p5 = ops.setContent(p4, 'gallery', ['images', 0], {
    mediaId: 'media_abcdef1234567890',
    alt: 'Upload',
    original: { src: '/template-media/garden-vows/bouquet-white.webp', alt: 'x' },
  })
  return { tpl, page, p2, p3, p4, p5 }
}

describe('templates', () => {
  it('every template passes the schema', () => {
    expect(TEMPLATES.length).toBe(18)
    expect(TEMPLATES.flatMap(validateTemplate)).toEqual([])
  })
})

describe('editing operations', () => {
  it('editing a page never mutates the template definition', () => {
    const tpl = TEMPLATES.find((t) => t.slug === 'garden-vows')
    const before = JSON.stringify(tpl)
    const { page } = buildEditedPage()
    expect(JSON.stringify(tpl)).toBe(before)
    expect(page.sections.find((s) => s.id === 'hero').content.title).toBe('Ana & Rui')
  })

  it('keeps navigation first and the hero fixed', () => {
    const { page } = buildEditedPage()
    const nav = page.sections[0]
    expect(nav.type).toBe('nav')
    expect(ops.canMove(page, nav, 1)).toBe(false)
    const hero = page.sections.find((s) => s.type === 'hero')
    expect(ops.canRemove(page, hero)).toBe(false)
    expect(ops.canDuplicate(page, hero)).toBe(false)
    expect(ops.canMove(page, page.sections[1], -1)).toBe(false)
    expect(addableTypes(page)).not.toContain('nav')
    expect(addableTypes(page)).not.toContain('hero')
  })

  it('adds, duplicates and moves sections with unique ids', () => {
    const { p2, p3, p4 } = buildEditedPage()
    expect(p2.sections[2].id).toBe('sec_testquote0001')
    expect(p3.sections.filter((s) => s.type === 'text')).toHaveLength(2)
    expect(new Set(p3.sections.map((s) => s.id)).size).toBe(p3.sections.length)
    expect(p4.sections.findIndex((s) => s.id === 'gallery')).toBe(p3.sections.findIndex((s) => s.id === 'gallery') - 1)
  })

  it('tracks uploaded media and only uses object URLs in the render copy', () => {
    const { p5 } = buildEditedPage()
    expect(collectMediaIds(p5).has('media_abcdef1234567890')).toBe(true)
    const resolved = resolvePageMedia(p5, new Map([['media_abcdef1234567890', 'blob:fake']]))
    expect(resolved.sections.find((s) => s.id === 'gallery').content.images[0].src).toBe('blob:fake')
    expect(JSON.stringify(p5)).not.toContain('blob:')
  })
})

describe('draft validation', () => {
  it('a saved draft round-trips through validation unchanged', () => {
    const { p5 } = buildEditedPage()
    const round = validatePage(JSON.parse(JSON.stringify(p5)), { templateExists })
    expect(round.ok).toBe(true)
    expect(canon(round.page.sections)).toEqual(canon(p5.sections))
  })

  it('strips unsafe links, foreign images, unknown fields, bad colours and fonts', () => {
    const { p5 } = buildEditedPage()
    const tampered = JSON.parse(JSON.stringify(p5))
    tampered.sections[1].content.title = 'Hi'
    tampered.sections[1].content.ctaHref = 'javascript:alert(1)'
    tampered.sections[1].content.image.src = 'https://evil.example/x.png'
    tampered.sections[1].content.evil = '<script>'
    tampered.theme.colors.bg = 'url(javascript:alert(1))'
    tampered.theme.fonts.display = 'Comic Sans'
    const cleaned = validatePage(tampered, { templateExists })
    const hero = cleaned.page.sections[1].content
    expect(cleaned.ok).toBe(true)
    expect(hero.ctaHref).toBeUndefined()
    expect(hero.image.src).toBeUndefined()
    expect(hero).not.toHaveProperty('evil')
    expect(cleaned.page.theme.colors).not.toHaveProperty('bg')
    expect(cleaned.page.theme.fonts).not.toHaveProperty('display')

    expect(validatePage({ ...tampered, schemaVersion: 99 }, { templateExists }).ok).toBe(false)
    expect(validatePage({ ...tampered, templateSlug: 'hello-baby' }, { templateExists }).ok).toBe(false)
    expect(validatePage({ ...tampered, sections: [{ id: 'x', type: 'iframe', variant: 'a', content: {} }] }, { templateExists }).ok).toBe(false)
  })
})
