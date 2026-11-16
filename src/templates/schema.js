/**
 * Template content schema — the contract between template data, the renderer
 * and the visual editor. Templates (and editable pages created from them) are
 * plain JSON-serialisable objects:
 *
 *   {
 *     slug, name, category, description, tags, featured, status,   // catalogue metadata
 *     theme:    { colors, fonts, type, radius, ornament, imageFilter }, // style (see theme.js)
 *     sections: [{ id, type, variant, tone?, options?, content }],    // ordered page sections
 *   }
 *
 * `content` holds everything a user edits (text, lists, images, links).
 * `type`/`variant`/`options`/`tone` are presentation choices the editor
 * exposes as layout pickers. Nothing a user edits lives in JSX.
 *
 * Field kinds:
 *   text      single line              richtext  paragraphs split by a blank line
 *   link      URL a button points to (http(s), mailto:, tel: or #anchor)
 *   number    numeric value
 *   image     { src?, mediaId?, alt, focus?, caption?, credit?, original? }
 *             src = bundled template photo; mediaId = a user upload (editor only)
 *   list      array of objects with the listed `of` fields
 *   strings   array of strings
 */

export const IMAGE = 'image'

export const SECTION_TYPES = {
  nav: {
    label: 'Navigation',
    variants: ['split', 'centered', 'chapters'],
    fields: {
      brand: 'text', links: 'strings', cta: 'text',
      // Chapter menu: each entry is a real link (usually #section) on the published page.
      items: { kind: 'list', of: { label: 'text', href: 'link' } },
    },
    variantFields: {
      split: ['brand', 'links', 'cta'],
      centered: ['brand', 'links', 'cta'],
      chapters: ['brand', 'items'],
    },
    /** Field labels specific to this section type. */
    labels: { items: 'Menu links', label: 'Menu label', href: 'Goes to (e.g. #chapter-1)' },
  },
  hero: {
    label: 'Hero',
    variants: ['cover', 'split', 'arch', 'poster', 'collage', 'editorial', 'framed', 'magazine'],
    options: {
      align: ['center', 'start', 'end'],
      overlay: ['dark', 'light', 'gradient'],
      height: ['tall', 'medium', 'full'],
      imageSide: ['left', 'right'],
      imageShape: ['rect', 'arch', 'circle', 'bleed'],
      ctaStyle: ['solid', 'outline', 'inverse'],
    },
    fields: {
      eyebrow: 'text', title: 'text', subtitle: 'text', meta: 'text', tags: 'strings',
      cta: 'text', ctaHref: 'link', badge: 'text',
      image: IMAGE, images: { kind: 'list', of: IMAGE },
    },
    /** Which fields and options each hero layout actually renders. */
    variantFields: {
      cover: ['eyebrow', 'title', 'subtitle', 'meta', 'cta', 'ctaHref', 'image'],
      split: ['eyebrow', 'title', 'subtitle', 'meta', 'cta', 'ctaHref', 'badge', 'image'],
      arch: ['eyebrow', 'title', 'subtitle', 'meta', 'image'],
      poster: ['eyebrow', 'title', 'subtitle', 'meta', 'image'],
      collage: ['eyebrow', 'title', 'subtitle', 'cta', 'ctaHref', 'images'],
      editorial: ['eyebrow', 'title', 'subtitle', 'tags'],
      framed: ['eyebrow', 'title', 'subtitle', 'image'],
      magazine: ['eyebrow', 'title', 'subtitle', 'meta', 'cta', 'ctaHref', 'images'],
    },
    variantOptions: {
      cover: ['align', 'overlay', 'height', 'ctaStyle'],
      split: ['imageSide', 'imageShape'],
    },
  },
  details: {
    label: 'Key details',
    variants: ['ticket', 'inline', 'cards', 'stickers'],
    fields: { eyebrow: 'text', title: 'text', note: 'text', items: { kind: 'list', of: { label: 'text', value: 'text' } } },
    variantFields: {
      ticket: ['eyebrow', 'title', 'items', 'note'],
      inline: ['eyebrow', 'title', 'items'],
      cards: ['eyebrow', 'title', 'items'],
      stickers: ['eyebrow', 'title', 'items'],
    },
  },
  text: {
    label: 'Text',
    variants: ['centered', 'split', 'dropcap', 'letter', 'essay'],
    options: { imageSide: ['left', 'right'] },
    fields: { eyebrow: 'text', title: 'text', body: 'richtext', image: IMAGE, cta: 'text', ctaHref: 'link', signature: 'text' },
    variantFields: {
      centered: ['eyebrow', 'title', 'body', 'cta', 'ctaHref'],
      split: ['eyebrow', 'title', 'body', 'cta', 'ctaHref', 'image'],
      dropcap: ['eyebrow', 'title', 'body'],
      letter: ['eyebrow', 'title', 'body', 'signature'],
      essay: ['eyebrow', 'title', 'body', 'image'],
    },
    variantOptions: { split: ['imageSide'] },
  },
  gallery: {
    label: 'Gallery',
    variants: ['masonry', 'filmstrip', 'polaroids', 'mosaic', 'bento', 'scrapbook', 'feature'],
    fields: { eyebrow: 'text', title: 'text', images: { kind: 'list', of: IMAGE } },
  },
  timeline: {
    label: 'Timeline',
    variants: ['vertical', 'schedule', 'years', 'alternating', 'programme'],
    fields: {
      eyebrow: 'text', title: 'text',
      items: { kind: 'list', of: { label: 'text', title: 'text', text: 'text', image: IMAGE } },
    },
  },
  list: {
    label: 'List',
    variants: ['numbered', 'menu', 'columns', 'lineup', 'tiles', 'people'],
    fields: {
      eyebrow: 'text', title: 'text', intro: 'text',
      // image: optional, shown by the Tiles and People layouts (older items simply have none).
      items: { kind: 'list', of: { title: 'text', text: 'text', meta: 'text', image: IMAGE } },
    },
    labels: { image: 'Photo (Modular tiles and People cards layouts)' },
  },
  stats: {
    label: 'Numbers',
    variants: ['big', 'cards'],
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
  cta: {
    label: 'Call to action',
    variants: ['banner', 'centered', 'signature'],
    fields: { title: 'text', text: 'text', button: 'text', buttonHref: 'link' },
  },
  contact: {
    label: 'Contact',
    variants: ['columns'],
    fields: { eyebrow: 'text', title: 'text', lines: { kind: 'list', of: { label: 'text', value: 'text' } } },
  },
  marquee: { label: 'Scrolling words', variants: ['band'], fields: { items: 'strings' } },
}

export const SECTION_TONES = ['default', 'surface', 'accent', 'inverse']

/** Presentation option available on every section type. */
export const GENERIC_OPTIONS = { spacing: ['compact', 'normal', 'roomy'] }

/**
 * Structural rules the editor must respect so pages always render sensibly.
 * Types not listed are free to add, duplicate, remove and reorder.
 */
export const SECTION_RULES = {
  nav: { max: 1, position: 'first', duplicable: false, addable: true },
  hero: { min: 1, max: 1, duplicable: false, removable: false, addable: false },
}

/** Human-readable labels for the editor UI. */
export const FIELD_LABELS = {
  brand: 'Site name', links: 'Menu items', cta: 'Button label', ctaHref: 'Button link',
  eyebrow: 'Small heading', title: 'Heading', subtitle: 'Subtitle', meta: 'Details line', tags: 'Tags',
  badge: 'Badge', image: 'Image', images: 'Images', note: 'Note', items: 'Items', body: 'Text',
  signature: 'Signature', intro: 'Introduction', label: 'Label', value: 'Value', text: 'Text',
  author: 'Author', parts: 'Countdown', unit: 'Unit', raised: 'Amount raised', goal: 'Goal',
  percent: 'Progress (%)', button: 'Button label', buttonHref: 'Button link', lines: 'Contact lines',
}

export const VARIANT_LABELS = {
  split: 'Split', centered: 'Centred', cover: 'Full-bleed photo', arch: 'Arched portrait', poster: 'Poster',
  collage: 'Photo collage', editorial: 'Editorial type', framed: 'Framed photo', ticket: 'Ticket', inline: 'Inline',
  cards: 'Cards', stickers: 'Stickers', dropcap: 'Editorial columns', letter: 'Handwritten letter',
  masonry: 'Masonry', filmstrip: 'Filmstrip', polaroids: 'Polaroids', mosaic: 'Mosaic', vertical: 'Vertical',
  schedule: 'Schedule', years: 'Years', numbered: 'Numbered', menu: 'Menu', columns: 'Columns', lineup: 'Line-up',
  big: 'Big numbers', large: 'Large', banner: 'Banner', boxes: 'Boxes', bar: 'Progress bar', band: 'Band',
  chapters: 'Chapter menu', magazine: 'Magazine cover', bento: 'Bento grid', alternating: 'Alternating rows',
  tiles: 'Modular tiles', people: 'People cards', scrapbook: 'Scrapbook', feature: 'Featured work', programme: 'Programme grid',
  essay: 'Photo essay',
}

export const OPTION_LABELS = {
  align: 'Text alignment', overlay: 'Photo overlay', height: 'Height', imageSide: 'Image side',
  imageShape: 'Image shape', ctaStyle: 'Button style', spacing: 'Spacing', tone: 'Background',
}

/** Readable label for a content field key (a section type may name its own fields differently). */
export const fieldLabel = (key, type) =>
  SECTION_TYPES[type]?.labels?.[key] ?? FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())

/** Fields that apply to a section's current variant (all fields when unspecified). */
export function fieldsForVariant(type, variant) {
  const def = SECTION_TYPES[type]
  if (!def) return []
  return def.variantFields?.[variant] ?? Object.keys(def.fields)
}

/** Layout options that apply to a section's current variant, plus generic options. */
export function optionsForVariant(type, variant) {
  const def = SECTION_TYPES[type]
  if (!def) return {}
  const keys = def.variantOptions ? (def.variantOptions[variant] ?? []) : Object.keys(def.options ?? {})
  return { ...Object.fromEntries(keys.map((k) => [k, def.options[k]])), ...GENERIC_OPTIONS }
}

/** Returns a list of problems with a template's (or page's) structure (empty when valid). */
export function validateTemplate(template) {
  const problems = []
  const ids = new Set()
  for (const section of template.sections ?? []) {
    const def = SECTION_TYPES[section.type]
    const where = `${template.slug ?? template.templateSlug} › ${section.id ?? '(no id)'}`
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
    const allowedOptions = { ...(def.options ?? {}), ...GENERIC_OPTIONS }
    for (const [key, value] of Object.entries(section.options ?? {})) {
      if (!allowedOptions[key]) problems.push(`${where}: unexpected option "${key}"`)
      else if (!allowedOptions[key].includes(value)) problems.push(`${where}: invalid ${key} "${value}"`)
    }
  }
  return problems
}
