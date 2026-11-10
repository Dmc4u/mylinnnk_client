/**
 * Starter content for sections a user adds in the editor. Every type comes
 * from SECTION_TYPES, so the editor can only add sections the renderer knows.
 */
import { SECTION_RULES, SECTION_TYPES } from '../../templates/schema.js'
import { newId } from './page.js'

const STARTERS = {
  nav: { variant: 'split', content: { brand: 'My page', links: ['About', 'Details', 'Contact'] } },
  details: {
    variant: 'cards',
    content: { eyebrow: 'Details', title: 'The essentials', items: [{ label: 'When', value: 'Add a date' }, { label: 'Where', value: 'Add a place' }, { label: 'Notes', value: 'Add a note' }] },
  },
  text: { variant: 'centered', content: { eyebrow: 'A few words', title: 'Tell your story', body: 'Write a few sentences here. Click this section to edit the text.' } },
  gallery: { variant: 'mosaic', content: { eyebrow: 'Gallery', title: 'Photos', images: [{ alt: '' }, { alt: '' }, { alt: '' }] } },
  timeline: {
    variant: 'vertical',
    content: { eyebrow: 'Timeline', title: 'How it happened', items: [{ label: 'First', title: 'The beginning', text: 'Describe this moment.' }, { label: 'Next', title: 'What came next', text: 'Describe this moment.' }] },
  },
  list: {
    variant: 'numbered',
    content: { eyebrow: 'List', title: 'Highlights', items: [{ title: 'First item', text: 'A short description.' }, { title: 'Second item', text: 'A short description.' }, { title: 'Third item', text: 'A short description.' }] },
  },
  stats: { variant: 'big', content: { items: [{ value: '10', label: 'something worth counting' }, { value: '25', label: 'another number' }, { value: '3', label: 'one more' }] } },
  quote: { variant: 'large', content: { text: 'A favourite quote or a few kind words.', author: 'Someone special' } },
  countdown: { variant: 'boxes', content: { eyebrow: 'Counting down', parts: [{ value: '30', unit: 'days' }, { value: '12', unit: 'hours' }, { value: '45', unit: 'minutes' }], note: 'Until the big day.' } },
  progress: { variant: 'bar', content: { eyebrow: 'Our goal', title: 'Help us get there', raised: '€0', goal: '€1,000', percent: 0, note: 'Every contribution counts.' } },
  cta: { variant: 'centered', content: { title: 'Join us', text: 'Add a short invitation here.', button: 'Reply' } },
  contact: { variant: 'columns', content: { eyebrow: 'Contact', title: 'Get in touch', lines: [{ label: 'Email', value: 'you@example.com' }, { label: 'Phone', value: '+00 000 000 000' }] } },
  marquee: { variant: 'band', content: { items: ['Celebrate', 'Share', 'Remember'] } },
}

/** Section types a user may add to this page right now, respecting SECTION_RULES. */
export function addableTypes(page) {
  return Object.keys(SECTION_TYPES).filter((type) => {
    const rule = SECTION_RULES[type] ?? {}
    if (rule.addable === false || !STARTERS[type]) return false
    if (rule.max && page.sections.filter((s) => s.type === type).length >= rule.max) return false
    return true
  })
}

export function createSection(type, id = newId('sec')) {
  const starter = STARTERS[type]
  if (!starter) throw new Error(`No starter for section type "${type}"`)
  return { id, type, variant: starter.variant, content: structuredClone(starter.content) }
}
