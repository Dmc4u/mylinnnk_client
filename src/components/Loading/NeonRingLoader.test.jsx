import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import NeonRingLoader from './NeonRingLoader.jsx'
const loaderCss = readFileSync('src/components/Loading/NeonRingLoader.css', 'utf8')

describe('NeonRingLoader', () => {
  it('renders one polite status and a decorative ring with a default label', () => {
    render(<NeonRingLoader />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Loading…')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
    expect(status).toHaveClass('neon-ring-loader--md', 'neon-ring-loader--inline')
    expect(status.querySelector('.neon-ring-loader__ring')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Loading…')).toHaveClass('neon-ring-loader__message--sr-only')
  })

  it.each(['sm', 'md', 'lg'])('supports the %s size', (size) => {
    render(<NeonRingLoader size={size} />)
    expect(screen.getByRole('status')).toHaveClass(`neon-ring-loader--${size}`)
  })

  it.each(['inline', 'centered', 'full-page'])('supports %s layout with a visible message', (mode) => {
    render(<NeonRingLoader mode={mode} message="Loading your page…" />)
    expect(screen.getByRole('status')).toHaveClass(`neon-ring-loader--${mode}`)
    expect(screen.getByText('Loading your page…')).not.toHaveClass('neon-ring-loader__message--sr-only')
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it.each(['centered', 'full-page'])('shows a default message in %s mode', (mode) => {
    render(<NeonRingLoader mode={mode} />)
    expect(screen.getByText('Loading…')).not.toHaveClass('neon-ring-loader__message--sr-only')
  })

  it('keeps its status stable on rerender and introduces no focusable elements', () => {
    const { container, rerender } = render(<NeonRingLoader message="Loading drafts…" className="draft-loading" />)
    const status = screen.getByRole('status')
    rerender(<NeonRingLoader message="Loading drafts…" className="draft-loading" />)
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toBe(status)
    expect(status).toHaveClass('draft-loading')
    expect(container.querySelector('button, a, input, [tabindex]')).toBeNull()
  })

  it('defines circular cyan and purple borders, glow and a one-second rotation', () => {
    const style = document.createElement('style')
    style.textContent = loaderCss
    document.head.append(style)
    try {
      const rules = [...style.sheet.cssRules]
      const ring = rules.find((rule) => rule.selectorText === '.neon-ring-loader__ring')
      expect(ring.style.getPropertyValue('box-sizing')).toBe('border-box')
      expect(ring.style.getPropertyValue('inline-size')).toBe('var(--neon-ring-size)')
      expect(ring.style.getPropertyValue('block-size')).toBe('var(--neon-ring-size)')
      expect(ring.style.getPropertyValue('border-width')).toBe('var(--neon-ring-stroke)')
      expect(ring.style.getPropertyValue('border-style')).toBe('solid')
      expect(ring.style.getPropertyValue('border-top-color')).toBe('var(--neon-ring-cyan)')
      expect(ring.style.getPropertyValue('border-bottom-color')).toBe('var(--purple-500, #8b5cf6)')
      expect(ring.style.getPropertyValue('border-radius')).toBe('50%')
      expect(ring.style.getPropertyValue('box-shadow')).toContain('20px')
      const motion = rules.find((rule) => rule.media?.mediaText === '(prefers-reduced-motion: no-preference)')
      const spinningRing = [...motion.cssRules].find((rule) => rule.selectorText === '.neon-ring-loader__ring')
      expect(spinningRing.style.getPropertyValue('animation')).toBe('mylinnnk-neon-ring-turn 1s linear infinite')
      const keyframes = rules.find((rule) => rule.name === 'mylinnnk-neon-ring-turn')
      expect([...keyframes.cssRules][0].style.getPropertyValue('transform')).toBe('rotate(1turn)')
    } finally {
      style.remove()
    }
  })

  it('provides a static reduced-motion ring with readable fallback text', () => {
    // jsdom cannot emulate CSS media preferences, so check the shipped media rules.
    const style = document.createElement('style')
    style.textContent = loaderCss
    document.head.append(style)
    try {
      const media = [...style.sheet.cssRules].find((rule) => rule.media?.mediaText === '(prefers-reduced-motion: reduce)')
      expect(media).toBeDefined()
      const container = [...media.cssRules].find((rule) => rule.selectorText === '.neon-ring-loader')
      expect(container.style.getPropertyValue('animation')).toBe('none')
      const ring = [...media.cssRules].find((rule) => rule.selectorText === '.neon-ring-loader__ring')
      const label = [...media.cssRules].find((rule) => rule.selectorText === '.neon-ring-loader__message--sr-only')
      expect(ring.style.getPropertyValue('animation')).toBe('none')
      expect(ring.style.getPropertyValue('transform')).toBe('none')
      expect(label.style.getPropertyValue('position')).toBe('static')
      expect(label.style.getPropertyValue('clip-path')).toBe('none')
      expect(label.style.getPropertyValue('inline-size')).toBe('auto')
    } finally {
      style.remove()
    }
  })
})
