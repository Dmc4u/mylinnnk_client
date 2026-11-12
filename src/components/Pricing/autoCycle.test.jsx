/**
 * Automatic rotation of the plan stack (useAutoCycle): every 4 s the next card
 * comes to the front; it pauses for hover, presses, keyboard focus, Pause,
 * reduced motion, an off-screen stack or a hidden tab, and never selects a plan.
 */
import 'fake-indexeddb/auto'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/renderApp.jsx'
import { AUTO_CYCLE_MS } from './useAutoCycle.js'

vi.setConfig({ testTimeout: 20000 })

/** IntersectionObserver stand-in: everything is on screen unless a test says otherwise. */
const observers = new Set()
let onScreen = true
class TestObserver {
  constructor(callback) {
    this.callback = callback
    this.targets = []
  }
  observe(target) {
    this.targets.push(target)
    observers.add(this)
    queueMicrotask(() => this.callback([{ isIntersecting: onScreen, target }]))
  }
  unobserve() {}
  disconnect() {
    observers.delete(this)
  }
  takeRecords() {
    return []
  }
}
const setOnScreen = async (value) => {
  onScreen = value
  await act(async () => observers.forEach((o) => o.targets.forEach((target) => o.callback([{ isIntersecting: value, target }]))))
}

beforeEach(() => {
  onScreen = true
  observers.clear()
  vi.stubGlobal('IntersectionObserver', TestObserver)
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] })
})
afterEach(() => {
  vi.useRealTimers()
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
})

const stack = () => document.querySelector('.plan-stack')
const front = () => document.querySelector('.plan-card.is-front')?.dataset.plan
const wait = (ms) => act(async () => vi.advanceTimersByTime(ms))
const tick = () => wait(AUTO_CYCLE_MS)

async function openPricing(path = '/pricing') {
  const utils = renderApp(path)
  await screen.findByRole('list', { name: 'Publishing plans' })
  await act(async () => {}) // let the observers report
  return utils
}

describe('automatic rotation', () => {
  it('brings each of the five plans forward in turn every 4 seconds, wrapping around, without selecting', async () => {
    const { location } = await openPricing()
    expect(front()).toBe('pro-monthly')
    await wait(AUTO_CYCLE_MS - 100)
    expect(front()).toBe('pro-monthly') // not early
    const seen = []
    for (let i = 0; i < 5; i++) {
      await wait(i === 0 ? 100 : AUTO_CYCLE_MS)
      seen.push(front())
    }
    expect(seen).toEqual(['pro-annual', 'free', 'celebration', 'pro-starter', 'pro-monthly'])
    expect(location()).toBe('/pricing') // ?plan= untouched
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
    // Automatic moves are not announced; the position text still updates.
    expect(screen.getByText(/Professional Monthly · 4 of 5/)).toHaveAttribute('aria-live', 'off')
  })

  it('pauses while the mouse is over the stack and resumes with a full interval when it leaves', async () => {
    const { user } = await openPricing()
    await user.hover(stack())
    await wait(AUTO_CYCLE_MS * 3)
    expect(front()).toBe('pro-monthly')
    await user.unhover(stack())
    await wait(AUTO_CYCLE_MS - 200)
    expect(front()).toBe('pro-monthly') // full interval after resuming
    await wait(200)
    expect(front()).toBe('pro-annual')
  })

  it('pauses while a mouse button is held, and stays paused after release while still hovering', async () => {
    const { user } = await openPricing()
    const card = document.querySelector('[data-plan="pro-monthly"] .plan-card__inner')
    await user.hover(card) // a mouse is over what it presses
    await user.pointer({ keys: '[MouseLeft>]', target: card })
    await wait(AUTO_CYCLE_MS * 2)
    expect(front()).toBe('pro-monthly')
    await user.pointer({ keys: '[/MouseLeft]', target: card })
    await wait(AUTO_CYCLE_MS * 2)
    expect(front()).toBe('pro-monthly') // the pointer is still over the stack
    await user.unhover(stack())
    await tick()
    expect(front()).toBe('pro-annual')
  })

  it('pauses while a finger is down and resumes a full interval after it lifts (or the gesture is cancelled)', async () => {
    const { user } = await openPricing()
    const card = document.querySelector('[data-plan="pro-monthly"] .plan-card__inner')
    await user.pointer({ keys: '[TouchA>]', target: card })
    await wait(AUTO_CYCLE_MS * 2)
    expect(front()).toBe('pro-monthly')
    await user.pointer({ keys: '[/TouchA]', target: card })
    await wait(AUTO_CYCLE_MS - 200)
    expect(front()).toBe('pro-monthly')
    await wait(200)
    expect(front()).toBe('pro-annual')

    fireEvent.pointerDown(card, { pointerType: 'touch' })
    await wait(AUTO_CYCLE_MS * 2)
    expect(front()).toBe('pro-annual')
    fireEvent.pointerCancel(window) // e.g. the browser took over for scrolling
    await tick()
    expect(front()).toBe('free')
  })

  it('pauses while keyboard focus is inside the stack and resumes when it leaves', async () => {
    const { user } = await openPricing()
    // Tab until keyboard focus is inside the stack (skipping inert cards, as browsers do; jsdom doesn't).
    const inStack = () => stack().contains(document.activeElement) && !document.activeElement.closest('[inert]')
    for (let i = 0; i < 40 && !inStack(); i++) await user.tab()
    expect(stack().contains(document.activeElement)).toBe(true)
    await wait(AUTO_CYCLE_MS * 2)
    expect(front()).toBe('pro-monthly')
    await user.keyboard('{ArrowRight}') // manual browsing still works while paused
    expect(front()).toBe('pro-annual')
    expect(screen.getByText(/Professional Annual · 5 of 5/)).toHaveAttribute('aria-live', 'polite')
    // Focus leaves the stack (Tab on past its last control).
    for (let i = 0; i < 40 && stack().contains(document.activeElement); i++) await user.tab()
    expect(stack().contains(document.activeElement)).toBe(false)
    await tick()
    expect(front()).toBe('free')
  })

  it('has a visible Pause / Play button that stops rotation until it is restarted', async () => {
    const { user } = await openPricing()
    const pause = screen.getByRole('button', { name: 'Pause automatic plan rotation' })
    expect(pause).toHaveTextContent('Pause')
    fireEvent.click(pause)
    const play = screen.getByRole('button', { name: 'Play automatic plan rotation' })
    expect(play).toHaveTextContent('Play')
    await user.unhover(stack())
    await wait(AUTO_CYCLE_MS * 3)
    expect(front()).toBe('pro-monthly')
    fireEvent.click(play)
    await wait(AUTO_CYCLE_MS - 200)
    expect(front()).toBe('pro-monthly')
    await wait(200)
    expect(front()).toBe('pro-annual')
  })

  it('restarts the interval after manual browsing instead of moving straight away', async () => {
    await openPricing()
    await wait(AUTO_CYCLE_MS - 500)
    fireEvent.click(screen.getByRole('button', { name: 'Next plan' }))
    expect(front()).toBe('pro-annual')
    await wait(AUTO_CYCLE_MS - 200)
    expect(front()).toBe('pro-annual')
    await wait(200)
    expect(front()).toBe('free')
  })

  it('continues from the plan in ?plan= without changing the selection', async () => {
    const { location } = await openPricing('/pricing?plan=celebration')
    expect(front()).toBe('celebration')
    await tick()
    expect(front()).toBe('pro-starter')
    expect(location()).toBe('/pricing?plan=celebration')
    expect(within(document.querySelector('[data-plan="celebration"]')).getByText('Selected')).toBeInTheDocument()
  })

  it('pauses while the stack is off screen', async () => {
    await openPricing()
    await setOnScreen(false)
    await wait(AUTO_CYCLE_MS * 3)
    expect(front()).toBe('pro-monthly')
    await setOnScreen(true)
    await tick()
    expect(front()).toBe('pro-annual')
  })

  it('pauses while the browser tab is hidden', async () => {
    await openPricing()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await wait(AUTO_CYCLE_MS * 3)
    expect(front()).toBe('pro-monthly')
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await tick()
    expect(front()).toBe('pro-annual')
  })

  it('starts paused for reduced motion, while manual navigation keeps working', async () => {
    const original = window.matchMedia
    window.matchMedia = (query) => ({ ...original(query), matches: query.includes('prefers-reduced-motion') })
    try {
      await openPricing()
      expect(screen.getByRole('button', { name: 'Play automatic plan rotation' })).toBeInTheDocument()
      await wait(AUTO_CYCLE_MS * 3)
      expect(front()).toBe('pro-monthly')
      fireEvent.click(screen.getByRole('button', { name: 'Next plan' }))
      expect(front()).toBe('pro-annual')
    } finally {
      window.matchMedia = original
    }
  })

  it('stops its timer when the page goes away', async () => {
    const errors = vi.spyOn(console, 'error')
    const { unmount } = await openPricing()
    unmount()
    await wait(AUTO_CYCLE_MS * 3)
    expect(errors).not.toHaveBeenCalled()
  })
})
