/**
 * Golden Jubilee (milestone birthday story) and the chapter menu (nav variant "chapters"):
 * reusable content only, real #section links on published pages, safe links only, older nav
 * layouts unchanged, and smooth scrolling only when reduced motion isn't requested.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TemplateRender from '../components/TemplateRender/TemplateRender.jsx'
import { CATEGORIES, TEMPLATES, getTemplateBySlug } from '../data/templates.js'
import { createPageFromTemplate, pageForRender, validatePage } from '../editor/model/page.js'
import { anchorId } from './renderMode.js'
import { fieldLabel, fieldsForVariant, validateTemplate } from './schema.js'

const template = getTemplateBySlug('golden-jubilee')
const templateExists = (slug) => TEMPLATES.some((t) => t.slug === slug)

describe('Golden Jubilee template', () => {
  it('is an available, featured Birthdays template that passes the schema', () => {
    expect(template).toBeTruthy()
    expect(template.category).toBe('birthdays')
    expect(CATEGORIES.some((c) => c.id === template.category)).toBe(true)
    expect(template.status).toBe('available')
    expect(validateTemplate(template)).toEqual([])
  })

  it('tells the story in the approved order: welcome, three chapters, next chapter, wishes', () => {
    const ids = template.sections.map((s) => s.id)
    const order = ['welcome', 'chapter-1', 'chapter-2', 'chapter-3', 'next-chapter', 'wishes'].map((id) => ids.indexOf(id))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('every chapter-menu link and "continue" button points at a section of the page', () => {
    const ids = new Set(template.sections.map((s) => anchorId(s.id)).filter(Boolean))
    const nav = template.sections.find((s) => s.type === 'nav')
    const hrefs = [...nav.content.items.map((i) => i.href), ...template.sections.map((s) => s.content.ctaHref).filter(Boolean)]
    expect(hrefs.length).toBeGreaterThanOrEqual(9)
    for (const href of hrefs) expect(ids.has(href.slice(1)), href).toBe(true)
  })

  it('contains no personal details: neutral sample text and bundled CC0 photos only', () => {
    const json = JSON.stringify(template)
    for (const personal of ['50 Years of Grace', 'A Testimony of Grace', 'Moses', 'November 17', 'wife']) expect(json).not.toContain(personal)
    const images = JSON.stringify(template.sections).match(/"src":"[^"]+"/g) ?? []
    expect(images.length).toBeGreaterThan(0)
    for (const src of images) expect(src).toMatch(/"src":"\/template-media\/[a-z0-9-]+\/[a-z0-9-]+\.webp"/)
    const credits = JSON.parse(readFileSync(resolve(process.cwd(), 'public/template-media/credits.json'), 'utf8'))
    const licensed = new Set(credits.filter((c) => c.license === 'CC0').map((c) => c.file))
    for (const src of images) expect(licensed.has(src.slice(7, -1)), src).toBe(true)
  })

  it('a page created from it is valid and keeps the chapter links', () => {
    const page = createPageFromTemplate(template)
    const result = validatePage(page, { templateExists })
    expect(result.ok).toBe(true)
    expect(result.page.sections.find((s) => s.type === 'nav').content.items).toHaveLength(6)
  })
})

describe('chapter menu (nav variant "chapters")', () => {
  it('published: a labelled menu of real in-page links, and each target section has its id', () => {
    const { container } = render(<TemplateRender template={pageForRender(createPageFromTemplate(template))} mode="published" />)
    const menu = screen.getByRole('navigation', { name: 'Chapters' })
    const links = within(menu).getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual(['Welcome', 'The Beginning', 'The Journey', 'Grace & Gratitude', 'My Next Chapter', 'Wishes'])
    for (const link of links) {
      expect(link).not.toHaveAttribute('target')
      expect(container.querySelector(link.getAttribute('href'))).not.toBeNull()
    }
    expect(screen.getByRole('link', { name: 'Begin the story' })).toHaveAttribute('href', '#chapter-1')
    expect(screen.getByRole('link', { name: 'Continue to Chapter 2' })).toHaveAttribute('href', '#chapter-2')
  })

  it('unsafe links are removed when a page is checked; an entry without a link is plain text', () => {
    const page = createPageFromTemplate(template)
    const nav = page.sections.find((s) => s.type === 'nav')
    nav.content.items = [
      { label: 'Bad', href: 'javascript:alert(1)' },
      { label: 'No link' },
      { label: 'Site', href: 'https://example.com' },
    ]
    const clean = validatePage(page, { templateExists }).page
    expect(clean.sections.find((s) => s.type === 'nav').content.items).toEqual([{ label: 'Bad' }, { label: 'No link' }, { label: 'Site', href: 'https://example.com' }])
    render(<TemplateRender template={pageForRender(clean)} mode="published" />)
    const menu = screen.getByRole('navigation', { name: 'Chapters' })
    expect(within(menu).getAllByRole('link')).toHaveLength(1)
    expect(within(menu).getByRole('link', { name: 'Site' })).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(menu).getByText('Bad').tagName).toBe('SPAN')
  })

  it('older nav layouts are unchanged: plain menu text, same editor fields', () => {
    const lisbon = getTemplateBySlug('golden-thirty')
    render(<TemplateRender template={pageForRender(createPageFromTemplate(lisbon))} mode="published" />)
    expect(screen.queryByRole('navigation', { name: 'Chapters' })).not.toBeInTheDocument()
    expect(screen.getByText('Menu').tagName).toBe('SPAN')
    expect(fieldsForVariant('nav', 'split')).toEqual(['brand', 'links', 'cta'])
    expect(fieldsForVariant('nav', 'centered')).toEqual(['brand', 'links', 'cta'])
    expect(fieldsForVariant('nav', 'chapters')).toEqual(['brand', 'items'])
    expect(fieldLabel('items', 'nav')).toBe('Menu links')
    expect(fieldLabel('items', 'details')).toBe('Items')
    expect(fieldLabel('links', 'nav')).toBe('Menu items')
  })

  it('smooth scrolling only when reduced motion is not requested; gold lettering only on this template', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/components/TemplateRender/TemplateRender.css'), 'utf8')
    const smooth = css.indexOf('scroll-behavior: smooth')
    expect(smooth).toBeGreaterThan(-1)
    expect(css.lastIndexOf('@media (prefers-reduced-motion: no-preference)', smooth)).toBeGreaterThan(-1)
    expect(css.match(/scroll-behavior: smooth/g)).toHaveLength(1)
    expect(css).toMatch(/\.tpl--golden-jubilee \.ts-hero__title/)
    expect(css).toMatch(/@media \(forced-colors: active\)/)
  })
})
