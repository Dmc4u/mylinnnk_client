/**
 * Template buttons follow the link set in the editor (published page and previews alike), published
 * pages never show a button that goes nowhere, and the MyLinnnk credit appears only when the server
 * says the plan bought includes it.
 */
import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TemplateRender from '../components/TemplateRender/TemplateRender.jsx'
import { getTemplateBySlug } from '../data/templates.js'
import { createPageFromTemplate, pageForRender } from '../editor/model/page.js'
import { preparePublishedPage } from '../pages/PublicPage/publicPage.js'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'
import PLANS_FIXTURE from '../test/fixtures/plans.json'

vi.setConfig({ testTimeout: 15000 })

/** A Lisbon page like /p/moses: a hero button with a link, and a CTA section button without one. */
function lisbon({ heroHref = 'https://github.com/Dmc4u', ctaHref } = {}) {
  const page = createPageFromTemplate(getTemplateBySlug('year-in-lisbon'))
  const hero = page.sections.find((s) => s.type === 'hero')
  hero.content.cta = 'Visit My Page'
  if (heroHref === undefined) delete hero.content.ctaHref
  else hero.content.ctaHref = heroHref
  const cta = page.sections.find((s) => s.type === 'cta')
  cta.content.button = 'Start reading'
  if (ctaHref) cta.content.buttonHref = ctaHref
  else delete cta.content.buttonHref
  return page
}
const asPublished = (page, extra = {}) => ({
  slug: 'moses',
  title: page.title,
  templateId: page.templateId,
  templateSlug: page.templateSlug,
  templateCategory: page.templateCategory,
  schemaVersion: page.schemaVersion,
  theme: page.theme,
  sections: page.sections,
  publishedAt: '2026-11-14T12:00:00.000Z',
  ...extra,
})

describe('template buttons', () => {
  it('a configured web link is a real link that opens safely in a new tab', () => {
    render(<TemplateRender template={pageForRender(lisbon())} mode="published" />)
    const link = screen.getByRole('link', { name: 'Visit My Page' })
    expect(link).toHaveAttribute('href', 'https://github.com/Dmc4u')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('mailto:, tel: and #section links work too, in the same tab; the section has its id', () => {
    for (const href of ['mailto:moses@example.com', 'tel:+2348000000000', '#cta']) {
      const { unmount, container } = render(<TemplateRender template={pageForRender(lisbon({ heroHref: href }))} mode="published" />)
      const link = screen.getByRole('link', { name: 'Visit My Page' })
      expect(link).toHaveAttribute('href', href)
      expect(link).not.toHaveAttribute('target')
      if (href === '#cta') expect(container.querySelector('#cta')).not.toBeNull()
      unmount()
    }
  })

  it('a button without a link is left off the published page, but stays visible while designing', () => {
    const page = pageForRender(lisbon())
    const published = render(<TemplateRender template={page} mode="published" />)
    expect(screen.queryByText('Start reading')).not.toBeInTheDocument()
    published.unmount()
    render(<TemplateRender template={page} />)
    const placeholder = screen.getByText('Start reading')
    expect(placeholder.tagName).toBe('SPAN')
    expect(placeholder).toHaveAttribute('title', expect.stringMatching(/Add a button link/))
  })

  it('preview parity: a linked button is the same link in the editor’s preview as on the published page', () => {
    const page = pageForRender(lisbon({ ctaHref: 'https://example.com/story' }))
    const preview = render(<TemplateRender template={page} />)
    const previewHref = screen.getByRole('link', { name: 'Start reading' }).getAttribute('href')
    preview.unmount()
    render(<TemplateRender template={page} mode="published" />)
    expect(screen.getByRole('link', { name: 'Start reading' })).toHaveAttribute('href', previewHref)
  })

  it('never turns an unsafe link into a working button', () => {
    for (const href of ['javascript:alert(1)', 'data:text/html,hi', '//evil.example', 'http://exa mple.com']) {
      const { unmount } = render(<TemplateRender template={pageForRender(lisbon({ heroHref: href }))} mode="published" />)
      expect(screen.queryByRole('link', { name: 'Visit My Page' })).not.toBeInTheDocument()
      unmount()
    }
    // And the published-page cleaner drops it before rendering at all.
    const prepared = preparePublishedPage(asPublished(lisbon({ heroHref: 'javascript:alert(1)' })))
    expect(JSON.stringify(prepared.render)).not.toContain('javascript:')
  })

  it('on /p/:slug, the published button goes where the owner set it', async () => {
    const api = createFakeAuthApi()
    api.state.publicPages.moses = asPublished(lisbon())
    renderApp('/p/moses', { api })
    const link = await screen.findByRole('link', { name: 'Visit My Page' })
    expect(link).toHaveAttribute('href', 'https://github.com/Dmc4u')
    expect(screen.queryByText('Start reading')).not.toBeInTheDocument()
  })
})

describe('MyLinnnk credit by plan (from the server, never from the page content)', () => {
  it('shown when the server says the plan includes it, with a working link', async () => {
    const api = createFakeAuthApi()
    api.state.publicPages.moses = asPublished(lisbon(), { branding: 'credit' })
    renderApp('/p/moses', { api })
    const main = await screen.findByRole('main')
    const credit = within(main).getByText(/Created with/)
    expect(within(credit).getByRole('link', { name: 'MyLinnnk' })).toHaveAttribute('href', '/')
  })

  for (const branding of ['none', undefined, 'CREDIT', true, { show: true }]) {
    it(`not shown for branding = ${JSON.stringify(branding)}`, async () => {
      const api = createFakeAuthApi()
      api.state.publicPages.moses = asPublished(lisbon(), branding === undefined ? {} : { branding })
      renderApp('/p/moses', { api })
      await screen.findByRole('link', { name: 'Visit My Page' })
      expect(screen.queryByText(/Created with/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Made with/)).not.toBeInTheDocument()
    })
  }

  it('page content can’t switch it on or off: only the server’s own field counts', () => {
    const page = lisbon()
    page.sections[0].content.branding = 'none' // content a customer could try to send
    expect(preparePublishedPage(asPublished(page, { branding: 'credit' })).branding).toBe('credit')
    const hidden = asPublished(lisbon())
    hidden.theme = { ...hidden.theme, branding: 'credit' }
    expect(preparePublishedPage(hidden).branding).toBe('none')
  })

  it('never appears in the editor, the template gallery or previews', () => {
    render(<TemplateRender template={pageForRender(lisbon())} branding="credit" />)
    expect(screen.queryByText(/Created with|Made with/)).not.toBeInTheDocument()
  })

  it('the plan descriptions say so', () => {
    const features = Object.fromEntries(PLANS_FIXTURE.plans.map((p) => [p.id, p.features.join(' | ')]))
    expect(features.celebration).toMatch(/“Created with MyLinnnk” credit/)
    for (const id of ['pro-starter', 'pro-monthly', 'pro-annual']) expect(features[id]).toMatch(/No MyLinnnk branding/)
    expect(PLANS_FIXTURE.plans.find((p) => p.id === 'celebration').branding).toBe(true)
  })
})
