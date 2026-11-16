/**
 * Count-up for statistics ("1,200+", "98%", "24", "₦3.5m"): the visible copy counts from 0 to the
 * number inside the text, then shows the exact original text. The real value is always in the page
 * for screen readers (see Stats), so the animation is visual only.
 */
const NUMBER = /^(\D{0,4}?)(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(.*)$/s

/** { prefix, value, decimals, grouped, suffix } or null when the text isn't a single leading number. */
export function parseStat(text) {
  const match = NUMBER.exec(String(text ?? '').trim())
  if (!match) return null
  const [, prefix, digits, suffix] = match
  const value = Number(digits.replace(/,/g, ''))
  if (!Number.isFinite(value) || value <= 0 || value > 1e12) return null
  return { prefix, value, decimals: digits.includes('.') ? digits.split('.')[1].length : 0, grouped: digits.includes(','), suffix }
}

export function formatStat(stat, current) {
  const n = stat.decimals ? current.toFixed(stat.decimals) : String(Math.round(current))
  const shown = stat.grouped ? Number(n).toLocaleString('en-US', { minimumFractionDigits: stat.decimals, maximumFractionDigits: stat.decimals }) : n
  return `${stat.prefix}${shown}${stat.suffix}`
}

const easeOut = (t) => 1 - (1 - t) ** 3

/**
 * Animates `el` (aria-hidden) from 0 to its final text over `duration` ms. Returns a cancel function
 * that leaves the exact final text in place.
 */
export function runCountUp(el, { duration = 1400, raf = requestAnimationFrame, caf = cancelAnimationFrame, now = () => performance.now() } = {}) {
  const finalText = el.dataset.countup ?? el.textContent
  const stat = parseStat(finalText)
  if (!stat) return () => {}
  const start = now()
  let frame = 0
  const step = () => {
    const t = Math.min(1, (now() - start) / duration)
    el.textContent = t >= 1 ? finalText : formatStat(stat, stat.value * easeOut(t))
    frame = t >= 1 ? 0 : raf(step)
  }
  el.textContent = formatStat(stat, 0)
  frame = raf(step)
  return () => {
    if (frame) caf(frame)
    el.textContent = finalText
  }
}
