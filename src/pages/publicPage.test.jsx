/**
 * Published pages at /p/:slug (Phase 5, Stage 2): rendered from the public API
 * without signing in, with only safe, supported content, and clear states for
 * unknown, unavailable and unreachable pages.
 */
import 'fake-indexeddb/auto'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getTemplateBySlug } from '../data/templates.js'
import { createPageFromTemplate } from '../editor/model/page.js'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'
import { preparePublishedPage } from './PublicPage/publicPage.js'

vi.setConfig({ testTimeout: 15000 })

/** What GET /public/pages/:slug returns for a live wedding page. */
function published(slug = 'sam-and-alex', edit = () => {}) {
  const draft = createPageFromTemplate(getTemplateBySlug('garden-vows'))
  const page = {
    slug,
    title: 'Sam & Alex',
    templateId: draft.templateId,
    templateSlug: draft.templateSlug,
    templateCategory: draft.templateCategory,
    schemaVersion: draft.schemaVersion,
    theme: draft.theme,
    sections: draft.sections,
    publishedAt: '2026-11-12T10:00:00.000Z',
  }
  edit(page)
  return page
}
const hero = (page) => page.sections.find((s) => s.type === 'hero')

function openPublic(slug, setup = () => {}) {
  const api = createFakeAuthApi()
  setup(api)
  return { ...renderApp(`/p/${slug}`, { api }), api }
}

describe('published page /p/:slug', () => {
  it('renders the page for visitors without signing in, with no editor or site chrome', async () => {
    const { api } = openPublic('sam-and-alex', (a) => (a.state.publicPages['sam-and-alex'] = published()))
    const main = await screen.findByRole('main', { name: 'Sam & Alex' })
    expect(within(main).getByText('are getting married')).toBeInTheDocument()
    expect(main.querySelector('.tpl')).not.toBeNull()
    expect(screen.queryByRole('button', { name: /save draft|publish|undo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument() // no MyLinnnk header
    expect(document.querySelector('.site-footer')).toBeNull() // only the template's own small credit line
    // Only the public endpoint was asked for the page; nothing private.
    const paths = api.state.requests.map((r) => r.path)
    expect(paths).toContain('/public/pages/sam-and-alex')
    expect(paths.some((p) => p.startsWith('/pages') || p.startsWith('/media'))).toBe(false)
    expect(api.state.requests.every((r) => r.method === 'GET')).toBe(true)
  })

  it('loads uploaded images through the page’s public image address, and keeps template photos', async () => {
    openPublic('with-photo', (a) => {
      a.state.publicPages['with-photo'] = published('with-photo', (p) => {
        hero(p).content.image = { alt: 'Sam and Alex on the beach', mediaId: 'media_0123456789abcdef', original: hero(p).content.image }
      })
    })
    const photo = await screen.findByRole('img', { name: 'Sam and Alex on the beach' })
    expect(photo).toHaveAttribute('src', '/api/v1/public/pages/with-photo/media/media_0123456789abcdef')
    const templatePhotos = screen.getAllByRole('img').filter((img) => img.getAttribute('src')?.startsWith('/template-media/'))
    expect(templatePhotos.length).toBeGreaterThan(0)
  })

  it('shows user text as text: markup is never interpreted and unsafe links are dropped', async () => {
    openPublic('xss', (a) => {
      a.state.publicPages.xss = published('xss', (p) => {
        hero(p).content.title = '<img src=x onerror=alert(1)><script>alert(2)</script>'
        hero(p).content.cta = 'Click me'
        hero(p).content.ctaHref = 'javascript:alert(3)'
      })
    })
    await screen.findByRole('main')
    expect(screen.getByText('<img src=x onerror=alert(1)><script>alert(2)</script>')).toBeInTheDocument()
    expect(document.querySelector('main script')).toBeNull()
    expect(document.querySelector('main img[src="x"]')).toBeNull()
    expect([...document.querySelectorAll('main a')].some((a) => /^javascript:/i.test(a.getAttribute('href') ?? ''))).toBe(false)
  })

  it('skips content it doesn’t support instead of failing', async () => {
    openPublic('mixed', (a) => {
      a.state.publicPages.mixed = published('mixed', (p) => {
        p.sections.splice(1, 0, { id: 'evil', type: 'iframe', variant: 'x', content: { src: 'https://evil.example' } })
        hero(p).content.unknownField = '<b>nope</b>'
      })
    })
    await screen.findByRole('main', { name: 'Sam & Alex' })
    expect(document.querySelector('[data-section="evil"]')).toBeNull()
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.queryByText('<b>nope</b>')).not.toBeInTheDocument()
  })

  it('says a page is unavailable when nothing safe is left to show', async () => {
    openPublic('empty', (a) => (a.state.publicPages.empty = published('empty', (p) => (p.sections = [{ id: 'x', type: 'script', content: {} }]))))
    expect(await screen.findByRole('heading', { name: 'This page isn’t available right now' })).toBeInTheDocument()
  })

  it('treats unknown, never-published and private pages the same: not found', async () => {
    openPublic('nobody-here')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to MyLinnnk' })).toHaveAttribute('href', '/')
  })

  it('explains a page that is no longer live (expired, in grace or unpublished)', async () => {
    openPublic('was-live', (a) => (a.state.publicPages['was-live'] = { gone: true }))
    expect(await screen.findByRole('heading', { name: 'This page isn’t available right now' })).toBeInTheDocument()
  })

  it('offers a retry when the server can’t be reached', async () => {
    const { api, user } = openPublic('flaky', (a) => {
      a.state.publicDown = true
      a.state.publicPages.flaky = published('flaky')
    })
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('heading', { name: 'We couldn’t load this page' })).toBeInTheDocument()
    api.state.publicDown = false
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.getByRole('main', { name: 'Sam & Alex' })).toBeInTheDocument())
  })
})

describe('preparing a published page for display', () => {
  it('uses the editor’s own cleaner: allowed fields only, safe links only, known templates only', () => {
    const page = published('clean', (p) => {
      hero(p).content.ctaHref = 'javascript:alert(1)'
      p.theme.colors.bg = 'url(javascript:alert(1))'
    })
    const prepared = preparePublishedPage(page)
    const h = prepared.render.sections.find((s) => s.type === 'hero')
    expect(h.content.ctaHref ?? '').not.toMatch(/javascript/i)
    expect(prepared.render.theme.colors.bg).toBeUndefined()
    expect(preparePublishedPage({ ...page, templateSlug: 'not-a-template' })).toBeNull()
    expect(preparePublishedPage(null)).toBeNull()
  })
})
