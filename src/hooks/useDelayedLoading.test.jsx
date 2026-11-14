import { StrictMode } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useDelayedLoading from './useDelayedLoading.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const advance = (milliseconds) => act(() => vi.advanceTimersByTime(milliseconds))

describe('useDelayedLoading', () => {
  it('never shows an indicator when loading completes at 100ms', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), { initialProps: { loading: true } })
    expect(result.current).toBe(false)
    advance(100)
    rerender({ loading: false })
    advance(1000)
    expect(result.current).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows the indicator at 200ms for an ongoing operation', () => {
    const { result } = renderHook(() => useDelayedLoading(true))
    advance(199)
    expect(result.current).toBe(false)
    advance(1)
    expect(result.current).toBe(true)
  })

  it('hides immediately when loading finishes after the indicator appears', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), { initialProps: { loading: true } })
    advance(200)
    expect(result.current).toBe(true)
    rerender({ loading: false })
    expect(result.current).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('starts a fresh delay after an already-visible loading cycle finishes', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), { initialProps: { loading: true } })
    advance(250)
    expect(result.current).toBe(true)
    rerender({ loading: false })
    rerender({ loading: true })
    expect(result.current).toBe(false)
    advance(199)
    expect(result.current).toBe(false)
    advance(1)
    expect(result.current).toBe(true)
  })

  it('cleans up a pending timer on unmount', () => {
    const { unmount } = renderHook(() => useDelayedLoading(true))
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    advance(1000)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores cancelled timers during rapid loading changes', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), { initialProps: { loading: true } })
    advance(150)
    rerender({ loading: false })
    rerender({ loading: true })
    advance(100)
    expect(result.current).toBe(false)
    rerender({ loading: false })
    advance(1000)
    expect(result.current).toBe(false)
    rerender({ loading: true })
    advance(200)
    expect(result.current).toBe(true)
  })

  it('keeps just one timer through StrictMode effect cleanup', () => {
    const { result, unmount } = renderHook(() => useDelayedLoading(true), { wrapper: StrictMode })
    expect(vi.getTimerCount()).toBe(1)
    advance(200)
    expect(result.current).toBe(true)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
