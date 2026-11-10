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
  return {
    '--t-bg': colors.bg,
    '--t-surface': colors.surface,
    '--t-surface-ink': colors.surfaceInk ?? colors.ink,
    '--t-ink': colors.ink,
    '--t-muted': colors.muted,
    '--t-accent': colors.accent,
    '--t-accent-ink': colors.accentInk,
    '--t-line': colors.line ?? `color-mix(in srgb, ${colors.ink} 14%, transparent)`,
    '--t-inverse-bg': colors.inverseBg ?? colors.ink,
    '--t-inverse-ink': colors.inverseInk ?? colors.bg,
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

/** Optional photo treatment applied to every image in a template. */
export const IMAGE_FILTERS = ['none', 'sepia', 'mono', 'warm']
