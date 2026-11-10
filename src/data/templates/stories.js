import { media } from './media.js'

/* ======================= Personal Stories ======================= */

const lisbon = media('year-in-lisbon')
export const yearInLisbon = {
  slug: 'year-in-lisbon',
  name: 'A Year in Lisbon',
  category: 'personal-stories',
  description: 'A magazine-style travel journal with a cinematic cover and illustrated chapters.',
  tags: ['travel', 'journal', 'chapters', 'photos'],
  featured: true,
  status: 'available',
  theme: {
    colors: { bg: '#f6f1e8', surface: '#fffaf1', ink: '#1e2a33', muted: '#5f6b74', accent: '#c2410c', accentInk: '#ffffff', inverseBg: '#16303f', inverseInk: '#f6f1e8' },
    fonts: { display: 'fraunces', body: 'fraunces', script: 'caveat' },
    type: { displayWeight: 300, displayTracking: '-0.035em', bodySize: '19px' },
    radius: 'none',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'cover', options: { align: 'start', overlay: 'dark' },
      content: {
        eyebrow: 'A travel journal',
        title: 'My year\nin Lisbon',
        subtitle: 'Twelve months, seven hills, countless pastéis.',
        image: lisbon('tram', 'A yellow tram climbing a narrow Lisbon street lined with flowers'),
      },
    },
    {
      id: 'prologue', type: 'text', variant: 'dropcap',
      content: {
        eyebrow: 'Prologue',
        title: 'Two suitcases and no Portuguese',
        body: 'I arrived in January with two suitcases, a phrasebook and a vague plan to stay for three months. The city had other ideas.\n\nBy spring I knew which bakery sold the last warm pastéis, which tram drivers waved and which viewpoint caught the best sunset.\n\nThis is the story of the year Lisbon quietly became home.',
      },
    },
    {
      id: 'chapters', type: 'timeline', variant: 'vertical', tone: 'surface',
      content: {
        eyebrow: 'Chapters',
        title: 'Twelve months, four favourites',
        items: [
          { label: 'Ch. 1', title: 'Arrival', text: 'Red rooftops, steep hills and getting lost on purpose.', image: lisbon('rooftops', 'Red-tiled rooftops of Lisbon under a blue sky') },
          { label: 'Ch. 4', title: 'Trams & tiles', text: 'Learning the city one tram line at a time.', image: lisbon('tram-red', 'A red tram running down a long street') },
          { label: 'Ch. 9', title: 'Fado nights', text: 'Late evenings in Alfama, and songs that made strangers cry.' },
          { label: 'Ch. 12', title: 'Goodbye to the river', text: 'One last sunset at Belém, and a promise to come back.', image: lisbon('belem', 'The Belém Tower standing at the edge of the river') },
        ],
      },
    },
    { id: 'quote', type: 'quote', variant: 'banner', tone: 'inverse', content: { text: 'Some cities you visit. Lisbon, you remember.' } },
    { id: 'cta', type: 'cta', variant: 'centered', content: { title: 'Read the full journal', text: 'Forty-two entries, two hundred photographs and one very long list of bakeries.', button: 'Start reading' } },
  ],
}

const letters = media('letters-home')
export const lettersHome = {
  slug: 'letters-home',
  name: 'Letters Home',
  category: 'personal-stories',
  description: 'A heritage page for family stories, with archival photos and a handwritten letter.',
  tags: ['family', 'memories', 'history', 'heritage'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#efe6d5', surface: '#f8f2e6', ink: '#3b3024', muted: '#76674f', accent: '#8a5a2b', accentInk: '#ffffff', inverseBg: '#3b3024', inverseInk: '#efe6d5' },
    fonts: { display: 'cormorant', body: 'cormorant', script: 'caveat' },
    type: { displayWeight: 500, displayTracking: '0', bodySize: '21px' },
    radius: 'none',
    imageFilter: 'sepia',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'framed',
      content: {
        eyebrow: 'The Silva family',
        title: 'Letters home',
        subtitle: 'Stories, recipes and photographs from three generations.',
        image: letters('family-sepia', 'An old sepia photograph of a family seated together', { caption: 'Madeira, 1951' }),
      },
    },
    {
      id: 'letter', type: 'text', variant: 'letter',
      content: {
        eyebrow: 'Funchal, 12 March 1952',
        body: 'My dearest Manuel, the ship leaves on Thursday. Mother has packed enough bread for a month and cried into every loaf.\n\nI am frightened and happy all at once. Keep the kitchen warm for me.',
        signature: 'Your Rosa',
      },
    },
    {
      id: 'history', type: 'timeline', variant: 'years', tone: 'surface',
      content: {
        eyebrow: 'Our history',
        title: 'Three generations',
        items: [
          { label: '1952', title: 'Rosa sails from Madeira', text: 'With one suitcase and her mother’s recipe book.' },
          { label: '1964', title: 'The bakery opens', text: 'Silva & Sons on Union Street sells out by noon.' },
          { label: '1988', title: 'The honey cake', text: 'Rosa’s famous recipe is finally written down.' },
        ],
      },
    },
    {
      id: 'album', type: 'gallery', variant: 'polaroids',
      content: {
        title: 'From the family album',
        images: [
          letters('grandmother', 'Portrait of an elderly woman smiling gently', { caption: 'Grandma Rosa' }),
          letters('family-bw', 'A black-and-white photograph of a large family', { caption: 'Union Street, 1964' }),
          letters('book', 'Close-up of an old book’s printed pages', { caption: 'The recipe book' }),
        ],
      },
    },
    { id: 'quote', type: 'quote', variant: 'large', content: { text: 'Everything I know about love, I learned in that kitchen.', author: 'Ana Silva, granddaughter' } },
  ],
}

/* ======================= Coming Soon ======================= */

const grad = media('graduation-day')
export const graduationDay = {
  slug: 'graduation-day',
  name: 'Graduation Day',
  category: 'coming-soon',
  description: 'Celebrate a graduate with achievements, photos and messages from family and friends.',
  tags: ['graduation', 'school', 'achievement'],
  featured: false,
  status: 'coming-soon',
  theme: {
    colors: { bg: '#f4f5fb', surface: '#ffffff', ink: '#14183a', muted: '#5b6690', accent: '#4f46e5', accentInk: '#ffffff', inverseBg: '#14183a', inverseInk: '#f4f5fb' },
    fonts: { display: 'syne', body: 'inter' },
    type: { displayWeight: 700, displayTracking: '-0.03em' },
    radius: 'soft',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'split', options: { imageSide: 'right' },
      content: {
        eyebrow: 'Class of 2027',
        title: 'Congratulations,\nJordan!',
        subtitle: 'BSc Computer Science · University of Porto',
        cta: 'Celebrate with us',
        image: grad('graduates', 'Graduates in caps and gowns at their ceremony'),
      },
    },
    {
      id: 'details', type: 'details', variant: 'cards', tone: 'surface',
      content: {
        items: [
          { label: 'Ceremony', value: 'July 3 · 10 am' },
          { label: 'Party', value: 'July 3 · 6 pm' },
          { label: 'Next stop', value: 'Berlin' },
        ],
      },
    },
    { id: 'cta', type: 'cta', variant: 'centered', content: { title: 'Four years of late nights', text: 'Come and celebrate the next chapter.', button: 'Leave a message' } },
  ],
}

const baby = media('hello-baby')
export const helloBaby = {
  slug: 'hello-baby',
  name: 'Hello, Baby',
  category: 'coming-soon',
  description: 'A soft, joyful announcement page for a new arrival.',
  tags: ['baby', 'announcement', 'family'],
  featured: false,
  status: 'coming-soon',
  theme: {
    colors: { bg: '#f6faf9', surface: '#ffffff', ink: '#1f3a3d', muted: '#61807f', accent: '#2a9d8f', accentInk: '#ffffff', inverseBg: '#e3f1ee', inverseInk: '#1f3a3d' },
    fonts: { display: 'fraunces', body: 'inter', script: 'caveat' },
    type: { displayWeight: 400, displayTracking: '-0.02em' },
    radius: 'round',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'arch',
      content: {
        eyebrow: 'Welcome to the world',
        title: 'Hello, Isla',
        subtitle: 'born March 3, 2027',
        meta: '3.2 kg · 50 cm · lots of hair',
        image: baby('feet', 'Tiny baby feet cradled in a parent’s hands'),
      },
    },
    {
      id: 'details', type: 'details', variant: 'inline', tone: 'inverse',
      content: {
        items: [
          { label: 'Born', value: 'March 3, 2027' },
          { label: 'Weight', value: '3.2 kg' },
          { label: 'Named after', value: 'Great-grandma Isabel' },
        ],
      },
    },
    {
      id: 'note', type: 'text', variant: 'split', options: { imageSide: 'right' },
      content: {
        eyebrow: 'From all of us',
        title: 'Our hearts have doubled in size',
        body: 'Isla arrived just before sunrise, and she has been running the house ever since. Thank you for all the love, meals and tiny socks.',
        image: baby('sleeping', 'A newborn baby sleeping peacefully'),
      },
    },
  ],
}
