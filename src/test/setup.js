import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Browser APIs jsdom doesn't implement, used by the site's motion and layout code.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
globalThis.IntersectionObserver ??= NoopObserver
globalThis.ResizeObserver ??= NoopObserver
window.matchMedia ??= (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
})
window.scrollTo = () => {}
// jsdom has <dialog> but not its modal API (used by the editor's dialogs).
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
Element.prototype.scrollIntoView ??= function scrollIntoView() {}

afterEach(async () => {
  cleanup()
  // The image upload queue is per tab (module state): start every test fresh.
  const { resetMediaSync } = await import('../editor/services/mediaSync.js')
  resetMediaSync()
  vi.unstubAllGlobals()
  localStorage.clear()
  sessionStorage.clear()
})
