import { describe, expect, it } from 'vitest'
import { formatCountdown, secondsLeft } from './countdown.js'

describe('payment countdown arithmetic', () => {
  const serverNow = '2026-11-16T10:00:00.000Z'
  const expiresAt = '2026-11-16T11:00:00.000Z'
  it('starts at 60:00 and counts down with time elapsed on this device since the server answered', () => {
    const receivedAt = 1_000_000
    expect(formatCountdown(secondsLeft({ expiresAt, serverNow, receivedAt }, receivedAt))).toBe('60:00')
    expect(formatCountdown(secondsLeft({ expiresAt, serverNow, receivedAt }, receivedAt + 61_000))).toBe('58:59')
    expect(secondsLeft({ expiresAt, serverNow, receivedAt }, receivedAt + 3600_000)).toBe(0)
    expect(secondsLeft({ expiresAt, serverNow, receivedAt }, receivedAt + 9_999_999)).toBe(0) // never negative
  })
  it('ignores the device’s own clock value and a clock moved backwards', () => {
    const receivedAt = Date.parse('2030-01-01T00:00:00Z') // a device clock years ahead
    expect(secondsLeft({ expiresAt, serverNow, receivedAt }, receivedAt + 1000)).toBe(3599)
    expect(secondsLeft({ expiresAt, serverNow, receivedAt }, receivedAt - 60_000)).toBe(3600) // moved back: no extra time
  })
  it('formats minutes and seconds with two digits', () => {
    expect(formatCountdown(3600)).toBe('60:00')
    expect(formatCountdown(59)).toBe('00:59')
    expect(formatCountdown(0)).toBe('00:00')
  })
})
