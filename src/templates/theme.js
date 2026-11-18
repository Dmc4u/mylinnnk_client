/**
 * Template theming. A template's `theme` is plain data (editor-friendly);
 * this module turns it into CSS custom properties for <TemplateRender>.
 */

/** Font keys a theme may use → CSS font stacks (faces declared in fonts.css). */
export const FONT_STACKS = {
  inter: 'Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  cormorant: '"Cormorant Garamond", "Iowan Old Style", Georgia, serif',
  'great-vibes': '"Great Vibes", "Segoe Script", cursive',
  fraunces: 'Fraunces, "Iowan Old Style", Georgia, serif',
  'dm-serif': '"DM Serif Display", Georgia, serif',
  playfair: '"Playfair Display", Georgia, serif',
  'space-grotesk': '"Space Grotesk", system-ui, sans-serif',
  bricolage: '"Bricolage Grotesque", system-ui, sans-serif',
  bebas: '"Bebas Neue", Impact, "Arial Narrow", sans-serif',
  caveat: 'Caveat, "Segoe Print", cursive',
  jetbrains: '"JetBrains Mono", ui-monospace, Consolas, monospace',
  fredoka: 'Fredoka, system-ui, sans-serif',
  syne: 'Syne, system-ui, sans-serif',
}

export const RADII = { none: '0px', soft: '10px', round: '22px', pill: '999px' }

/**
 * theme = {
 *   colors: { bg, surface, ink, muted, accent, accentInk, surfaceInk?, line?, inverseBg?, inverseInk? },
 *   fonts:  { display, body, script? }            // keys of FONT_STACKS
 *   type:   { displayWeight?, displayCase?, displayTracking?, displayScale?, bodySize? },
 *   radius: 'none' | 'soft' | 'round' | 'pill',
 *   ornament?: 'botanical' | 'confetti' | 'stars' | 'waves' | 'none',
 *   imageFilter?: 'none' | 'sepia' | 'mono' | 'warm',
 * }
 */
export function themeToStyle(theme) {
  const { colors, fonts, type = {}, radius = 'soft' } = theme
  const safe = readableColors(colors)
  return {
    '--t-bg': colors.bg,
    '--t-surface': colors.surface,
    '--t-surface-ink': safe.surfaceInk,
    '--t-ink': safe.ink,
    '--t-muted': safe.muted,
    '--t-accent': colors.accent,
    '--t-accent-ink': safe.accentInk,
    '--t-accent-on-bg': safe.accentOnBg,
    '--t-accent-on-surface': safe.accentOnSurface,
    '--t-accent-on-inverse': safe.accentOnInverse,
    '--t-accent-on-poster': safe.accentOnPoster,
    '--t-poster-bg': safe.posterBg,
    '--t-poster-ink': safe.posterInk,
    '--t-scrim': safe.scrim,
    '--t-line': colors.line ?? `color-mix(in srgb, ${colors.ink} 14%, transparent)`,
    '--t-inverse-bg': colors.inverseBg ?? colors.ink,
    '--t-inverse-ink': safe.inverseInk,
    '--t-font-display': FONT_STACKS[fonts.display] ?? FONT_STACKS.inter,
    '--t-font-body': FONT_STACKS[fonts.body] ?? FONT_STACKS.inter,
    '--t-font-script': FONT_STACKS[fonts.script ?? fonts.display] ?? FONT_STACKS.inter,
    '--t-display-weight': type.displayWeight ?? 600,
    '--t-display-case': type.displayCase ?? 'none',
    '--t-display-tracking': type.displayTracking ?? '-0.02em',
    '--t-display-scale': type.displayScale ?? 1,
    '--t-body-size': type.bodySize ?? '18px',
    '--t-radius': RADII[radius] ?? RADII.soft,
  }
}

/* ---------- Readability guards, computed from the page's own colours ----------
   Saved themes and published snapshots are never changed: these values are worked out each time a
   page is drawn. Where a colour pair already reads (WCAG AA), the page's own colour is used unchanged,
   so readable pages look exactly as designed. Where it doesn't (older template defaults, or a user's
   choice), the text is drawn in a deeper or lighter shade of the *same* colour, just enough to reach
   the threshold, so the page keeps its branding. A few layouts also need colours chosen per theme:
   the poster cover, and the overlay that darkens a photo behind white cover text.
   Colours that can't be parsed (e.g. hsl()) are left exactly as they are. */

function rgbOf(color) {
  const c = String(color ?? '').trim()
  let m = c.match(/^#([0-9a-f]{3})$/i)
  if (m) return [...m[1]].map((x) => parseInt(x + x, 16))
  m = c.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
  m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  return m ? m.slice(1, 4).map(Number) : null
}

function luminance(rgb) {
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
}

export function contrastBetween(a, b) {
  const [x, y] = [rgbOf(a), rgbOf(b)]
  if (!x || !y) return null
  const [l1, l2] = [luminance(x), luminance(y)].sort((p, q) => q - p)
  return (l1 + 0.05) / (l2 + 0.05)
}

const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
const passesAll = (color, backgrounds, min) => backgrounds.every((bg) => (contrastBetween(color, bg) ?? Infinity) >= min)

/**
 * `color` when it reads on every background (at least `min`:1), otherwise the nearest shade of it
 * (towards black on light backgrounds, white on dark ones) that does. Unparsable colours are returned
 * unchanged; if no shade reaches the threshold, black or white, whichever reads better.
 */
export function readableShade(color, backgrounds, min = 4.5) {
  const rgb = rgbOf(color)
  const bgs = backgrounds.filter((bg) => rgbOf(bg))
  if (!rgb || !bgs.length || passesAll(color, bgs, min)) return color
  const toward = luminance(rgbOf(bgs[0])) > 0.18 ? 0 : 255
  for (let step = 1; step <= 100; step++) {
    const shade = toHex(rgb.map((v) => v + (toward - v) * (step / 100)))
    if (passesAll(shade, bgs, min + 0.05)) return shade
  }
  return toward === 0 ? '#111111' : '#ffffff'
}

const sameSide = (a, b) => rgbOf(a) && rgbOf(b) && luminance(rgbOf(a)) > 0.18 === luminance(rgbOf(b)) > 0.18

/** Text on a filled colour (buttons, accent sections): the chosen colour, or black/white if it doesn't read. */
function readableOnFill(ink, fill, min = 4.5) {
  if (!rgbOf(ink) || !rgbOf(fill) || contrastBetween(ink, fill) >= min) return ink
  const best = contrastBetween('#111111', fill) >= contrastBetween('#ffffff', fill) ? '#111111' : '#ffffff'
  return contrastBetween(best, fill) >= min ? best : ink
}

/** The colour values a page is drawn with: the saved theme, with the readability guards applied. */
export function readableColors(colors) {
  const surfaceInk = colors.surfaceInk ?? colors.ink
  const inverseBg = colors.inverseBg ?? colors.ink
  const inverseInk = colors.inverseInk ?? colors.bg
  // Poster cover: the inverse pair, unless the accent (its highlight colour) disappears on it.
  const accentOnInverse = contrastBetween(colors.accent, inverseBg)
  const accentOnBg = contrastBetween(colors.accent, colors.bg)
  const posterSwap = accentOnInverse !== null && accentOnInverse < 3 && accentOnBg !== null && accentOnBg >= 3
  const posterBg = posterSwap ? colors.bg : inverseBg
  // The photo overlay behind white cover text: the inverse background when it is dark (most themes),
  // otherwise the darkest of the theme's ink and background.
  const known = [inverseBg, colors.ink, colors.bg].filter((c) => rgbOf(c))
  const inverseIsLight = rgbOf(inverseBg) && luminance(rgbOf(inverseBg)) > 0.3
  const darkest = inverseIsLight && known.length === 3 ? known.reduce((a, b) => (luminance(rgbOf(b)) < luminance(rgbOf(a)) ? b : a)) : inverseBg
  return {
    ink: readableShade(colors.ink, [colors.bg]),
    // Secondary text sits on the page and on cards; cards count only when they are on the same side
    // (light/dark) as the page, otherwise no single shade could suit both.
    muted: readableShade(colors.muted, sameSide(colors.bg, colors.surface) ? [colors.bg, colors.surface] : [colors.bg]),
    surfaceInk: readableShade(surfaceInk, [colors.surface]),
    inverseInk: readableShade(inverseInk, [inverseBg]),
    accentInk: readableOnFill(colors.accentInk, colors.accent),
    // The accent used as text (labels, small headings) on each background. Fills keep the accent itself.
    accentOnBg: readableShade(colors.accent, [colors.bg]),
    accentOnSurface: readableShade(colors.accent, [colors.surface]),
    accentOnInverse: readableShade(colors.accent, [inverseBg], 3),
    accentOnPoster: readableShade(colors.accent, [posterBg], 3),
    posterBg,
    posterInk: posterSwap ? colors.ink : inverseInk,
    scrim: darkest,
  }
}

/**
 * Templates with lettering in fixed brand colours (Golden Jubilee's gold) keep it while the page uses
 * the template's own accent: every accent the template has shipped with, so pages made earlier keep
 * their look. A page whose owner chose another accent is "customised": its lettering follows that colour.
 */
const SHIPPED_ACCENTS = { 'golden-jubilee': ['#8a6416', '#876216'] }

export const accentCustomised = (slug, colors) =>
  Boolean(SHIPPED_ACCENTS[slug]) && !SHIPPED_ACCENTS[slug].includes(String(colors?.accent ?? '').trim().toLowerCase())

/** Optional photo treatment applied to every image in a template. */
export const IMAGE_FILTERS = ['none', 'sepia', 'mono', 'warm']
