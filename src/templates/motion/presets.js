/**
 * Motion presets: each is plain data, turned into CSS custom properties and data attributes on the
 * template root (see resolveMotion.js) and drawn by motion.css. Nothing here is template-specific.
 *
 * Fields
 *   duration  ms per element            distance  px of travel (smaller on phones)
 *   stagger   ms between elements      ease      CSS easing for entrances
 *   blur      px of blur for 'blur'    parallax  px of scroll parallax for hero images (0 = none)
 *   heading   entrance of headings:     'rise' | 'pop' | 'blur' | 'mask' | 'slide'
 *   text      entrance of text:         'rise' | 'pop' | 'blur' | 'slide' | 'fade'
 *   media     entrance of images:       'settle' | 'curtain' | 'pop' | 'fade'
 *   item      entrance of cards/items:  'rise' | 'pop' | 'slide' | 'fade'
 *   hover     button / link hover:      'lift' | 'spring' | 'sheen' | 'glow'
 *
 * To add a preset: add an entry here (any combination of the values above). To add a new kind of
 * entrance or hover: add its keyframes / rule in motion.css and use its name here.
 */
export const MOTION_PRESETS = Object.freeze({
  graceful: { duration: 1100, distance: 26, stagger: 110, ease: 'cubic-bezier(0.22, 0.61, 0.36, 1)', blur: 8, parallax: 40, heading: 'blur', text: 'rise', media: 'settle', item: 'rise', hover: 'glow' },
  joyful: { duration: 760, distance: 26, stagger: 70, ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)', blur: 6, parallax: 30, heading: 'pop', text: 'rise', media: 'pop', item: 'pop', hover: 'spring' },
  glamour: { duration: 1300, distance: 20, stagger: 120, ease: 'cubic-bezier(0.16, 1, 0.3, 1)', blur: 10, parallax: 50, heading: 'mask', text: 'blur', media: 'settle', item: 'rise', hover: 'sheen' },
  editorial: { duration: 950, distance: 24, stagger: 80, ease: 'cubic-bezier(0.16, 1, 0.3, 1)', blur: 6, parallax: 60, heading: 'mask', text: 'rise', media: 'curtain', item: 'rise', hover: 'lift' },
  bold: { duration: 620, distance: 46, stagger: 55, ease: 'cubic-bezier(0.2, 0.9, 0.1, 1)', blur: 4, parallax: 70, heading: 'slide', text: 'rise', media: 'curtain', item: 'slide', hover: 'lift' },
  calm: { duration: 820, distance: 16, stagger: 60, ease: 'cubic-bezier(0.25, 0.8, 0.25, 1)', blur: 4, parallax: 24, heading: 'rise', text: 'fade', media: 'fade', item: 'rise', hover: 'lift' },
  tender: { duration: 1200, distance: 18, stagger: 120, ease: 'cubic-bezier(0.33, 1, 0.68, 1)', blur: 8, parallax: 28, heading: 'blur', text: 'rise', media: 'settle', item: 'pop', hover: 'glow' },
})

export const DEFAULT_PRESET = 'graceful'

/** A template's category → its usual preset. A template can choose its own with `motion` in its definition. */
export const CATEGORY_MOTION = Object.freeze({
  birthdays: 'joyful',
  weddings: 'graceful',
  anniversaries: 'graceful',
  'leadership-community': 'calm',
  business: 'calm',
  portfolios: 'editorial',
  events: 'bold',
  'personal-stories': 'editorial',
  'coming-soon': 'tender',
})

/** Gentle looping motion for the theme's ornaments (the ornament is part of each template's design). */
export const ORNAMENT_AMBIENT = Object.freeze({
  botanical: 'sway',
  confetti: 'float',
  stars: 'twinkle',
  waves: 'drift',
})
