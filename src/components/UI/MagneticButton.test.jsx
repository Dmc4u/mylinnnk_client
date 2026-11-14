import 'fake-indexeddb/auto'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import MagneticButton from './MagneticButton.jsx'
import Button from '../Button/Button.jsx'
import { renderApp } from '../../test/renderApp.jsx'

const buttonCss = readFileSync('src/components/UI/MagneticButton.css', 'utf8')
const wrapperCss = [
  'src/components/Button/Button.css',
  'src/components/Pricing/Pricing.css',
  'src/components/GetStarted/GetStarted.css',
].map((file) => readFileSync(file, 'utf8')).join('\n')

vi.setConfig({ testTimeout: 15000 })

describe('MagneticButton', () => {
  it('renders a native button with a decorative layer and accessible label', () => {
    render(<MagneticButton aria-label="Create a new page">Create page</MagneticButton>)
    const button = screen.getByRole('button', { name: 'Create a new page' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveTextContent('Create page')
    expect(button.querySelector('.magnetic-button__layer')).toHaveAttribute('aria-hidden', 'true')
  })

  it.each(['primary', 'secondary', 'navy'])('supports the %s variant', (variant) => {
    render(<MagneticButton variant={variant}>Continue</MagneticButton>)
    expect(screen.getByRole('button')).toHaveClass(`magnetic-button--${variant}`)
  })

  it.each(['sm', 'md', 'lg'])('supports %s sizing', (size) => {
    render(<MagneticButton size={size}>Continue</MagneticButton>)
    expect(screen.getByRole('button')).toHaveClass(`magnetic-button--${size}`)
  })

  it('preserves click handlers and native Enter and Space activation', async () => {
    const user = userEvent.setup()
    const click = vi.fn()
    render(<MagneticButton onClick={click}>Save draft</MagneticButton>)
    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()
    await user.keyboard('{Enter} ')
    await user.click(screen.getByRole('button'))
    expect(click).toHaveBeenCalledTimes(3)
  })

  it('preserves explicit submit behavior', async () => {
    const user = userEvent.setup()
    const submit = vi.fn((event) => event.preventDefault())
    render(<form onSubmit={submit}><MagneticButton type="submit">Log in</MagneticButton></form>)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('navigates through React Router with keyboard activation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<MagneticButton to="/templates">Create your page</MagneticButton>} />
          <Route path="/templates" element={<h1>Template gallery</h1>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/templates')
    await user.tab()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'Template gallery' })).toBeInTheDocument()
  })

  it('preserves anchor destinations and attributes', () => {
    render(<MagneticButton href="https://example.com/help" target="_blank" rel="noopener">Help</MagneticButton>)
    expect(screen.getByRole('link', { name: 'Help' })).toHaveAttribute('href', 'https://example.com/help')
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener')
  })

  it('blocks disabled button activation', async () => {
    const user = userEvent.setup()
    const click = vi.fn()
    render(<MagneticButton disabled onClick={click}>Continue</MagneticButton>)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toBeDisabled()
    expect(click).not.toHaveBeenCalled()
  })

  it.each([{ to: '/templates' }, { href: '/templates' }])('removes disabled link destinations (%j)', (destination) => {
    const click = vi.fn()
    render(<MagneticButton {...destination} disabled onClick={click}>Continue</MagneticButton>)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('aria-disabled', 'true')
    expect(link).toHaveAttribute('tabindex', '-1')
    expect(link).not.toHaveAttribute('href')
    fireEvent.click(link)
    expect(click).not.toHaveBeenCalled()
  })

  it('announces loading through the busy state and blocks duplicate activation', async () => {
    const user = userEvent.setup()
    const click = vi.fn()
    const { rerender } = render(<MagneticButton loading loadingLabel="Saving…" onClick={click}>Save</MagneticButton>)
    const button = screen.getByRole('button', { name: 'Saving…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('.magnetic-button__spinner')).toHaveAttribute('aria-hidden', 'true')
    await user.click(button)
    expect(click).not.toHaveBeenCalled()
    rerender(<MagneticButton onClick={click}>Save</MagneticButton>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('makes loading links inactive', () => {
    render(<MagneticButton to="/templates" loading loadingLabel="Opening…">Open</MagneticButton>)
    const link = screen.getByRole('link', { name: 'Opening…' })
    expect(link).toHaveAttribute('aria-busy', 'true')
    expect(link).not.toHaveAttribute('href')
  })

  it.each(['before', 'after'])('stacks the gradient below transformable text when wrapper CSS loads %s', (order) => {
    const style = document.createElement('style')
    style.textContent = order === 'before' ? wrapperCss + buttonCss : buttonCss + wrapperCss
    document.head.append(style)
    try {
      render(
        <MemoryRouter>
          <Button to="/templates">Create Your Page Free</Button>
          <MagneticButton className="plan-btn">Choose plan</MagneticButton>
        </MemoryRouter>,
      )
      for (const control of [screen.getByRole('link'), screen.getByRole('button')]) {
        const layer = getComputedStyle(control.querySelector('.magnetic-button__layer'))
        const content = getComputedStyle(control.querySelector('.magnetic-button__content'))
        expect(layer.zIndex).toBe('0')
        expect(layer.overflow).toBe('hidden')
        expect(layer.pointerEvents).toBe('none')
        expect(content.position).toBe('relative')
        expect(content.zIndex).toBe('2')
        expect(content.display).toBe('inline-flex')
      }
    } finally {
      style.remove()
    }
  })

  it('keeps a rotated diagonal accent visible at rest and slides it inward with opposing label movement', () => {
    const style = document.createElement('style')
    style.textContent = buttonCss
    document.head.append(style)
    try {
      const rules = [...style.sheet.cssRules]
      const face = rules.find((rule) => rule.selectorText === '.magnetic-button__layer::before')
      const root = rules.find((rule) => rule.selectorText === '.magnetic-button')
      expect(face.style.getPropertyValue('background')).toBe('var(--magnetic-layer-gradient)')
      expect(root.style.getPropertyValue('--magnetic-layer-gradient')).toContain('linear-gradient(90deg')
      expect(face.style.getPropertyValue('opacity')).toBe('1')
      expect(face.style.getPropertyValue('width')).toBe('140%')
      expect(face.style.getPropertyValue('height')).toBe('140%')
      expect(face.style.getPropertyValue('top')).toBe('-20%')
      expect(face.style.getPropertyValue('left')).toBe('-20%')
      expect(face.style.getPropertyValue('transform')).toBe('var(--magnetic-layer-rest)')
      expect(root.style.getPropertyValue('--magnetic-layer-rest')).toBe('translate(-71.4286%, -71.4286%) rotate(25deg)')
      expect(face.style.getPropertyValue('transition')).toBe('transform 450ms ease')
      const label = rules.find((rule) => rule.selectorText === '.magnetic-button__content')
      expect(label.style.getPropertyValue('transition')).toBe('transform 350ms ease')
      const hover = rules.find((rule) => rule.media?.mediaText.includes('(hover: hover)'))
      expect(hover.media.mediaText).toContain('(pointer: fine)')
      expect(hover.media.mediaText).toContain('(prefers-reduced-motion: no-preference)')
      const hoverRules = [...hover.cssRules]
      const background = hoverRules.find((rule) => rule.selectorText.endsWith('.magnetic-button__layer::before'))
      const content = hoverRules.find((rule) => rule.selectorText.endsWith('.magnetic-button__content'))
      expect(background.selectorText).toMatch(/:not\(\[aria-disabled=["']true["']\]\)/)
      expect(background.style.getPropertyValue('transform')).toBe('translate(0, 0) rotate(0deg)')
      expect(content.style.getPropertyValue('transform')).toBe('translate(-6px, -2px)')
    } finally {
      style.remove()
    }
  })

  it('disables magnetic transforms and spinner motion for reduced motion', () => {
    const style = document.createElement('style')
    style.textContent = buttonCss
    document.head.append(style)
    try {
      const media = [...style.sheet.cssRules].find((rule) => rule.media?.mediaText === '(prefers-reduced-motion: reduce)')
      expect(media).toBeDefined()
      const rules = [...media.cssRules]
      const movement = rules.find((rule) => rule.selectorText.includes('.magnetic-button__content'))
      expect(movement.style.getPropertyValue('transform')).toBe('none')
      expect(movement.style.getPropertyValue('transition')).toBe('none')
      const face = rules.find((rule) => rule.selectorText === '.magnetic-button .magnetic-button__layer::before')
      expect(face.style.getPropertyValue('transform')).toBe('var(--magnetic-layer-rest)')
      expect(face.style.getPropertyValue('transition')).toBe('none')
      const spinner = rules.find((rule) => rule.selectorText === '.magnetic-button .magnetic-button__spinner')
      expect(spinner.style.getPropertyValue('animation')).toBe('none')
    } finally {
      style.remove()
    }
  })
})

describe('magnetic button application integrations', () => {
  it('renders magnetic header and homepage primary CTAs with their existing destination', async () => {
    renderApp('/')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    await within(nav).findByRole('link', { name: 'Log in' })
    const header = within(nav).getByRole('link', { name: 'Create Your Page Free' })
    const hero = document.querySelector('.hero__actions .magnetic-button')
    for (const control of [header, hero]) {
      expect(control).toHaveClass('magnetic-button', 'btn--primary')
      expect(control).toHaveAttribute('href', '/templates')
      expect(control.querySelector('.magnetic-button__layer')).toHaveAttribute('aria-hidden', 'true')
      expect(control.querySelector('.magnetic-button__content')).toHaveTextContent('Create Your Page Free')
    }
  })

  it('renders gallery Use This Template links through the magnetic wrapper', async () => {
    renderApp('/templates')
    const links = await screen.findAllByRole('link', { name: /^Use This Template:/ })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveClass('magnetic-button', 'btn--sm')
      expect(link.getAttribute('href')).toMatch(/^\/editor\//)
      expect(link.querySelector('.magnetic-button__layer')).toBeInTheDocument()
    }
  })

  it('renders the front pricing Choose Plan action with its selection handler', async () => {
    const { user } = renderApp('/pricing')
    const deck = await screen.findByRole('list', { name: 'Publishing plans' })
    const front = deck.querySelector('.plan-card.is-front')
    const choose = within(front).getByRole('button', { name: /^Choose .* plan$/ })
    expect(choose).toHaveClass('magnetic-button', 'plan-btn')
    expect(choose.querySelector('.magnetic-button__layer')).toBeInTheDocument()
    await user.click(choose)
    expect(choose).toHaveAttribute('aria-pressed', 'true')
  })
})
