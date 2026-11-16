import { getTemplateBySlug } from '../../data/templates.js'
import { CATEGORY_MOTION, DEFAULT_PRESET, MOTION_PRESETS, ORNAMENT_AMBIENT } from './presets.js'

/**
 * Which preset a page uses, without anything stored on the page (no schema change):
 *   1. the template definition's own `motion` (a deliberate personality),
 *   2. its category (CATEGORY_MOTION),
 *   3. its design traits (ornament, corner radius, display font),
 *   4. DEFAULT_PRESET.
 * `template` is either a template definition or a page prepared for rendering ({ slug, theme, sections });
 * pages are matched to their template by slug. New templates get motion automatically.
 */
export function resolvePreset(template) {
  const definition = template?.category ? template : template?.slug ? getTemplateBySlug(template.slug) : null
  const own = definition?.motion ?? template?.motion
  if (own && MOTION_PRESETS[own]) return own
  const byCategory = CATEGORY_MOTION[definition?.category ?? template?.category]
  if (byCategory) return byCategory
  return presetFromTraits(template?.theme ?? definition?.theme)
}

function presetFromTraits(theme) {
  if (!theme) return DEFAULT_PRESET
  if (theme.ornament === 'confetti') return 'joyful'
  if (theme.ornament === 'stars') return 'glamour'
  if (theme.ornament === 'botanical' || theme.ornament === 'waves') return 'graceful'
  const display = theme.fonts?.display
  if (['bebas', 'space-grotesk', 'bricolage', 'syne'].includes(display) && theme.radius === 'none') return 'bold'
  if (['jetbrains', 'inter', 'space-grotesk'].includes(display)) return 'calm'
  if (['fredoka', 'caveat'].includes(display) || theme.radius === 'pill') return 'joyful'
  if (['cormorant', 'playfair', 'dm-serif', 'fraunces'].includes(display)) return 'editorial'
  return DEFAULT_PRESET
}

/**
 * The root attributes for a page: data-* attributes (read by motion.css) and CSS custom properties.
 * `play`: false for still renders (editing canvas, thumbnails), true for previews and published pages.
 */
export function motionAttributes(template, { play }) {
  const preset = resolvePreset(template)
  const p = MOTION_PRESETS[preset]
  const ambient = ORNAMENT_AMBIENT[template?.theme?.ornament] ?? 'none'
  const attrs = {
    'data-motion': preset,
    'data-m-heading': p.heading,
    'data-m-text': p.text,
    'data-m-media': p.media,
    'data-m-item': p.item,
    'data-m-hover': p.hover,
    'data-m-ambient': ambient,
    ...(play ? { 'data-motion-play': '' } : {}),
  }
  const style = {
    '--m-dur': `${p.duration}ms`,
    '--m-dist-base': `${p.distance}px`,
    '--m-stagger': `${p.stagger}ms`,
    '--m-ease': p.ease,
    '--m-blur': `${p.blur}px`,
    '--m-parallax': `${p.parallax}px`,
  }
  return { preset, attrs, style }
}
