/** WCAG contrast helpers for the theme panel. */

export function toHex6(color) {
  if (typeof color !== 'string') return '#000000'
  const c = color.trim()
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${[...c.slice(1)].map((x) => x + x).join('')}`.toLowerCase()
  if (/^#[0-9a-f]{8}$/i.test(c)) return c.slice(0, 7).toLowerCase()
  const m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  if (m) return `#${m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`
  return '#000000'
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(toHex6(hex).slice(i, i + 2), 16) / 255)
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrastRatio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Black or white, whichever reads better on `background`. */
export const readableOn = (background) => (contrastRatio('#111111', background) >= contrastRatio('#ffffff', background) ? '#111111' : '#ffffff')
