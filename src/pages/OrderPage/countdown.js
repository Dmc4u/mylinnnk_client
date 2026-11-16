import { useEffect, useState } from 'react'

/**
 * Payment-window countdown. The deadline (`expiresAt`) and the server's clock at the time of the answer
 * (`serverNow`) both come from the API, so the countdown is right after a reload and even if the device's
 * clock is wrong: only the time elapsed on this device since the answer (`receivedAt`) is added. The
 * server enforces the deadline itself; this display can never extend or shorten it.
 */
export function secondsLeft({ expiresAt, serverNow, receivedAt }, deviceNow = Date.now()) {
  const deadline = Date.parse(expiresAt)
  if (!Number.isFinite(deadline)) return null
  const server = Date.parse(serverNow)
  const nowOnServer = Number.isFinite(server) && Number.isFinite(receivedAt) ? server + Math.max(0, deviceNow - receivedAt) : deviceNow
  return Math.max(0, Math.ceil((deadline - nowOnServer) / 1000))
}

/** 3600 → "60:00", 59 → "00:59". */
export const formatCountdown = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

/** Seconds left, updated every second while there is a deadline (null without one). */
export function useCountdown(timing) {
  const [now, setNow] = useState(() => Date.now())
  const active = Boolean(timing?.expiresAt)
  useEffect(() => {
    if (!active) return undefined
    // Ticks every second. Until the first tick, a "now" older than the latest server answer counts as no
    // time elapsed (secondsLeft never adds negative time), so a fresh order always starts at its full time.
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active, timing?.expiresAt, timing?.receivedAt])
  return active ? secondsLeft(timing, now) : null
}
