/**
 * Gallery sizing (all styles). Layout itself is checked in a real browser; these tests guard the
 * rules that keep any number of photos usable: polaroid cards wrap into columns instead of
 * shrinking into slivers, their captions sit below the photo, the filmstrip scrolls instead of
 * cutting photos off, and no photo is hidden on phones. Every photo is rendered, with its caption.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TemplateRender from '../components/TemplateRender/TemplateRender.jsx'
import { getTemplateBySlug } from '../data/templates.js'

const css = readFileSync(resolve(process.cwd(), 'src/components/TemplateRender/TemplateRender.css'), 'utf8').replace(/\r\n/g, '\n')
/** The declarations of the first rule whose selector list is exactly `selector`. */
const rule = (selector) => {
  const at = css.indexOf(`\n${selector} {`)
  expect(at, selector).toBeGreaterThan(-1)
  return css.slice(at, css.indexOf('}', at))
}

const gallery = (variant, count) => {
  const base = getTemplateBySlug('golden-jubilee')
  const images = Array.from({ length: count }, (_, i) => ({ src: `/p${i}.jpg`, alt: `Photo ${i + 1}`, caption: `Caption ${i + 1}` }))
  return { ...base, sections: [{ id: 'g', type: 'gallery', variant, content: { title: 'Photos', images } }] }
}

describe('gallery sizing', () => {
  it('renders every photo with its caption, whatever the style and number', () => {
    for (const variant of ['masonry', 'filmstrip', 'polaroids', 'mosaic', 'bento', 'scrapbook', 'feature']) {
      for (const count of [1, 4, 12]) {
        const { container, unmount } = render(<TemplateRender template={gallery(variant, count)} />)
        const grid = container.querySelector(`.ts-gallery__grid--${variant}`)
        expect(grid.querySelectorAll('figure')).toHaveLength(count)
        expect(grid.querySelectorAll('figcaption')).toHaveLength(count)
        unmount()
      }
    }
  })

  it('polaroids wrap into columns with a capped card width, photo ratio fixed, caption in the flow', () => {
    const grid = rule('.ts-gallery__grid--polaroids')
    expect(grid).toMatch(/flex-wrap: wrap/)
    const card = rule('.ts-gallery__grid--polaroids .ts-gallery__item')
    expect(card).toMatch(/flex: 0 0 min\(300px, .*var\(--pol-cols\)\)/)
    expect(card).not.toMatch(/\bheight:/)
    expect(rule('.ts-gallery__grid--polaroids .ts-img')).toMatch(/aspect-ratio/)
    expect(rule('.ts-gallery__grid--polaroids figcaption')).toMatch(/position: static/)
    expect(css).toMatch(/\.ts-gallery__grid--polaroids:has\(> :nth-child\(4\)\) \{ --pol-cols: 4; \}/)
  })

  it('the filmstrip scrolls sideways (photos after the third stay reachable)', () => {
    const strip = rule('.ts-gallery__grid--filmstrip')
    expect(strip).toMatch(/overflow-x: auto/)
    expect(strip).not.toMatch(/overflow: hidden/)
  })

  it('no gallery photo is hidden on small screens, and extra mosaic rows keep their height', () => {
    expect(css).not.toMatch(/ts-gallery__item:nth-child\([^)]*\) \{ display: none; \}/)
    expect(rule('.ts-gallery__grid--mosaic')).toMatch(/grid-auto-rows: 230px/)
  })

  it('keeps the decorative tilt and offset of the polaroids', () => {
    expect(css).toMatch(/\.ts-gallery__grid--polaroids \.ts-gallery__item:nth-child\(odd\) \{ rotate: -3deg; \}/)
    expect(css).toMatch(/\.ts-gallery__grid--polaroids \.ts-gallery__item:nth-child\(even\) \{ rotate: 3deg; translate: 0 18px; \}/)
  })
})
