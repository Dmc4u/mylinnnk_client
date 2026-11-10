/**
 * Template content schema — the contract between template data and a future
 * visual editor. Templates are plain JSON-serialisable objects:
 *
 *   {
 *     slug, name, category, description, tags, featured, status,   // catalogue metadata
 *     theme:    { colors, fonts, type, radius, ornament },            // style (see theme.js)
 *     sections: [{ id, type, variant, tone?, options?, content }],    // ordered page sections
 *   }
 *
 * `content` holds everything a user would edit (text, lists, images).
 * `type`/`variant`/`options`/`tone` are presentation choices an editor can
 * expose as layout pickers. Nothing a user edits lives in JSX.
 *
 * Field kinds:
 *   text      single line              richtext  paragraphs split by a blank line
 *   image     { src, alt, focus?, caption?, credit? }
 *   list      array of objects with the listed `of` fields
 *   strings   array of strings
 */

export const IMAGE = 'image'

export const SECTION_TYPES = {
  nav: {
    label: 'Navigation',
    variants: ['split', 'centered'],
    fields: { brand: 'text', links: 'strings', cta: 'text' },
  },
  hero: {
    label: 'Hero',
    variants: ['cover', 'split', 'arch', 'poster', 'collage', 'editorial', 'framed'],
    options: {
      align: ['center', 'start', 'end'],
      overlay: ['dark', 'light', 'gradient'],
      height: ['tall', 'medium'],
      imageSide: ['left', 'right'],
      imageShape: ['rect', 'arch', 'circle', 'bleed'],
      ctaStyle: ['solid', 'outline', 'inverse'],
    },
    fields: {
      eyebrow: 'text', title: 'text', subtitle: 'text', meta: 'text', cta: 'text', badge: 'text',
      image: IMAGE, images: { kind: 'list', of: IMAGE },
    },
  },
  details: {
    label: 'Key details',
    variants: ['ticket', 'inline', 'cards', 'stickers'],
    fields: { eyebrow: 'text', title: 'text', note: 'text', items: { kind: 'list', of: { label: 'text', value: 'text' } } },
  },
  text: {
    label: 'Text',
    variants: ['centered', 'split', 'dropcap', 'letter'],
    options: { imageSide: ['left', 'right'] },
    fields: { eyebrow: 'text', title: 'text', body: 'richtext', image: IMAGE, cta: 'text', signature: 'text' },
  },
  gallery: {
    label: 'Gallery',
    variants: ['masonry', 'filmstrip', 'polaroids', 'mosaic'],
    fields: { eyebrow: 'text', title: 'text', images: { kind: 'list', of: IMAGE } },
  },
  timeline: {
    label: 'Timeline',
    variants: ['vertical', 'schedule', 'years'],
    fields: {
      eyebrow: 'text', title: 'text',
      items: { kind: 'list', of: { label: 'text', title: 'text', text: 'text', image: IMAGE } },
    },
  },
  list: {
    label: 'List',
    variants: ['numbered', 'menu', 'columns', 'lineup'],
    fields: {
      eyebrow: 'text', title: 'text', intro: 'text',
      items: { kind: 'list', of: { title: 'text', text: 'text', meta: 'text' } },
    },
  },
  stats: {
    label: 'Numbers',
    variants: ['big'],
    fields: { eyebrow: 'text', title: 'text', items: { kind: 'list', of: { value: 'text', label: 'text' } } },
  },
  quote: { label: 'Quote', variants: ['large', 'banner'], fields: { text: 'text', author: 'text' } },
  countdown: {
    label: 'Countdown',
    variants: ['boxes'],
    fields: { eyebrow: 'text', note: 'text', parts: { kind: 'list', of: { value: 'text', unit: 'text' } } },
  },
  progress: {
    label: 'Fundraising progress',
    variants: ['bar'],
    fields: { eyebrow: 'text', title: 'text', raised: 'text', goal: 'text', percent: 'number', note: 'text' },
  },
  cta: { label: 'Call to action', variants: ['banner', 'centered', 'signature'], fields: { title: 'text', text: 'text', button: 'text' } },
  contact: {
    label: 'Contact',
    variants: ['columns'],
    fields: { eyebrow: 'text', title: 'text', lines: { kind: 'list', of: { label: 'text', value: 'text' } } },
  },
  marquee: { label: 'Scrolling words', variants: ['band'], fields: { items: 'strings' } },
}

export const SECTION_TONES = ['default', 'surface', 'accent', 'inverse']

/** Returns a list of problems with a template's structure (empty when valid). */
export function validateTemplate(template) {
  const problems = []
  const ids = new Set()
  for (const section of template.sections ?? []) {
    const def = SECTION_TYPES[section.type]
    const where = `${template.slug} › ${section.id ?? '(no id)'}`
    if (!section.id) problems.push(`${where}: missing id`)
    else if (ids.has(section.id)) problems.push(`${where}: duplicate id`)
    ids.add(section.id)
    if (!def) {
      problems.push(`${where}: unknown type "${section.type}"`)
      continue
    }
    if (!def.variants.includes(section.variant)) problems.push(`${where}: unknown ${section.type} variant "${section.variant}"`)
    if (section.tone && !SECTION_TONES.includes(section.tone)) problems.push(`${where}: unknown tone "${section.tone}"`)
    for (const key of Object.keys(section.content ?? {})) {
      if (!(key in def.fields)) problems.push(`${where}: unexpected field "${key}"`)
    }
  }
  return problems
}
