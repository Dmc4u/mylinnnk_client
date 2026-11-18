import { media } from './media.js'

/* ======================= Portfolios ======================= */

const frame = media('frame-and-field')
export const frameAndField = {
  slug: 'frame-and-field',
  name: 'Frame & Field',
  category: 'portfolios',
  description: 'An image-first photography portfolio: dark, quiet and built around the work.',
  tags: ['photography', 'gallery', 'artist', 'dark'],
  featured: true,
  status: 'available',
  theme: {
    colors: { bg: '#0e0f11', surface: '#17191c', ink: '#f2f2f0', muted: '#9a9c9f', accent: '#e8c37a', accentInk: '#111111', line: 'rgba(242, 242, 240, 0.12)', inverseBg: '#f2f2f0', inverseInk: '#0e0f11' },
    fonts: { display: 'inter', body: 'inter' },
    type: { displayWeight: 200, displayTracking: '-0.055em' },
    radius: 'none',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'LENA DUARTE', links: ['Work', 'Books', 'About', 'Contact'] } },
    {
      id: 'hero', type: 'hero', variant: 'cover', options: { align: 'start', overlay: 'dark' },
      content: {
        eyebrow: 'Photographer · Porto',
        title: 'Light, land\nand the people\nin between.',
        image: frame('mountain', 'A mountain peak rising above a valley under a clear sky'),
      },
    },
    {
      // Full-width featured work: the lead image runs edge to edge, the series beneath.
      id: 'work', type: 'gallery', variant: 'feature',
      content: {
        eyebrow: 'Selected work',
        title: 'Portfolio 2024–2027',
        images: [
          frame('cave-view', 'Blue mountains seen through the mouth of a cave'),
          frame('peaks-dusk', 'Jagged peaks at dusk in soft pink light'),
          frame('tailor', 'An elderly tailor working at his sewing machine'),
          frame('lake', 'A still lake reflecting a forest and snowy mountain'),
          frame('cliffs', 'Dark sea cliffs under a dramatic sky'),
        ],
      },
    },
    {
      id: 'about', type: 'text', variant: 'dropcap', tone: 'surface',
      content: {
        eyebrow: 'About',
        title: 'Slow photographs for fast times',
        body: 'I photograph places that take a while to reach and people who take a while to know. Most of my work is made on foot, over many visits, in all kinds of weather.\n\nMy pictures have appeared in travel magazines, outdoor brands’ campaigns and two books of landscape photography. I also shoot a handful of weddings each year, for couples who would rather hike than pose.\n\nPrints are available in limited editions of 25, printed on cotton rag paper in my Porto studio.',
      },
    },
    {
      id: 'contact', type: 'contact', variant: 'columns',
      content: {
        eyebrow: 'Commissions',
        title: 'Working on something?',
        lines: [
          { label: 'Email', value: 'studio@example.com' },
          { label: 'Based in', value: 'Porto, travelling often' },
          { label: 'Prints', value: 'Limited editions of 25' },
          { label: 'Represented by', value: 'Galeria Norte' },
        ],
      },
    },
  ],
}

const mono = media('studio-mono')
export const studioMono = {
  slug: 'studio-mono',
  name: 'Studio Mono',
  category: 'portfolios',
  description: 'A typographic designer portfolio with a case-study index and monospaced details.',
  tags: ['designer', 'developer', 'typographic', 'minimal'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f4f4f1', surface: '#ffffff', ink: '#111111', muted: '#666660', accent: '#6d28d9', accentInk: '#ffffff', inverseBg: '#111111', inverseInk: '#f4f4f1' },
    fonts: { display: 'jetbrains', body: 'inter' },
    type: { displayWeight: 500, displayTracking: '-0.05em', displayScale: 0.8 },
    radius: 'none',
    imageFilter: 'mono',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'kai.moreno', links: ['work', 'about', 'notes', 'contact'] } },
    {
      id: 'hero', type: 'hero', variant: 'editorial',
      content: {
        eyebrow: '// product designer',
        title: 'I design calm\nsoftware for\nbusy people.',
        subtitle: 'Currently leading design at a health-tech start-up. Previously at agencies in Berlin and Madrid.',
        tags: ['Available for advising', 'Madrid', 'UTC+1'],
      },
    },
    {
      id: 'work', type: 'list', variant: 'numbered',
      content: {
        eyebrow: 'Selected case studies',
        title: 'Work',
        items: [
          { title: 'Pulse Health', text: 'Redesigning appointment booking for two million patients.', meta: '2026' },
          { title: 'Ledger', text: 'A calmer finance app for freelancers and small studios.', meta: '2025' },
          { title: 'Wayfinder', text: 'Indoor maps that help visitors find their way around hospitals.', meta: '2024' },
          { title: 'Fieldnotes', text: 'A research repository for product teams of every size.', meta: '2023' },
        ],
      },
    },
    {
      // Editorial photo essay
      id: 'about', type: 'text', variant: 'essay', tone: 'surface',
      content: {
        eyebrow: '// about',
        title: 'Design is mostly listening',
        body: 'I spend my days with nurses, accountants and engineers, turning complicated work into interfaces that feel obvious.\n\nWhen I’m not designing, I’m writing about accessible interfaces or teaching a weekend course on design systems.',
        image: mono('desk-light', 'Sunlight and shadows falling across a tidy desk'),
      },
    },
    {
      id: 'contact', type: 'contact', variant: 'columns', tone: 'inverse',
      content: {
        eyebrow: '// contact',
        title: 'Say hello',
        lines: [
          { label: 'Email', value: 'kai@example.com' },
          { label: 'Elsewhere', value: 'LinkedIn · Read.cv' },
          { label: 'Writing', value: 'notes.example.com' },
          { label: 'Speaking', value: 'Open for 2027' },
        ],
      },
    },
  ],
}

/* ======================= Events ======================= */

const summer = media('summer-sessions')
export const summerSessions = {
  slug: 'summer-sessions',
  name: 'Summer Sessions',
  category: 'events',
  description: 'A loud festival poster with a giant line-up, neon accents and a ticket stub.',
  tags: ['music', 'festival', 'concert', 'line-up'],
  featured: true,
  status: 'available',
  theme: {
    colors: { bg: '#0a0a14', surface: '#f7f7fb', surfaceInk: '#0a0a14', ink: '#f7f7fb', muted: '#a6a6c4', accent: '#c6ff3d', accentInk: '#0a0a14', line: 'rgba(247, 247, 251, 0.14)', inverseBg: '#0a0a14', inverseInk: '#f7f7fb' },
    fonts: { display: 'bebas', body: 'space-grotesk' },
    type: { displayWeight: 400, displayCase: 'uppercase', displayTracking: '0.01em' },
    radius: 'none',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'poster',
      content: {
        eyebrow: 'Riverside Park · 3 nights',
        title: 'Summer\nSessions\n2027',
        subtitle: 'Open-air music by the river. Food trucks, two stages and long golden evenings.',
        meta: 'July 17–19 · Doors 5 pm · All ages',
        image: summer('stage', 'A crowd with raised hands in front of a brightly lit stage'),
      },
    },
    {
      // Performer cards with photos
      id: 'lineup', type: 'list', variant: 'people',
      content: {
        eyebrow: 'Line-up',
        title: 'Who’s playing',
        items: [
          { title: 'The Velvet Tides', meta: 'Friday · Main stage', text: 'Dreamy surf-pop to open the weekend.', image: summer('guitarist', 'A guitarist performing under a spotlight') },
          { title: 'Nova Lane', meta: 'Friday · River stage', text: 'Big choruses, bigger crowds.', image: summer('stage', 'A stage glowing with coloured lights') },
          { title: 'Mira & the Moths', meta: 'Saturday · Main stage', text: 'Folk songs with a dance-floor heart.', image: summer('hands', 'Hands raised towards a lit stage') },
          { title: 'Sun Club', meta: 'Sunday · Closing set', text: 'The sunset party you’ll talk about all year.', image: summer('confetti-crowd', 'A crowd with confetti falling') },
        ],
      },
    },
    {
      id: 'photos', type: 'gallery', variant: 'filmstrip',
      content: {
        images: [
          summer('confetti-crowd', 'Confetti falling over a festival crowd'),
          summer('guitarist', 'A guitarist performing under stage lights'),
          summer('hands', 'Fans with their hands in the air at a concert'),
        ],
      },
    },
    {
      id: 'tickets', type: 'details', variant: 'ticket',
      content: {
        items: [
          { label: 'Dates', value: 'July 17–19' },
          { label: 'Venue', value: 'Riverside Park' },
          { label: 'Doors', value: '5 pm nightly' },
        ],
        note: 'Weekend pass €45',
      },
    },
    { id: 'cta', type: 'cta', variant: 'banner', tone: 'accent', content: { title: 'See you by the river', text: 'Day tickets from €18. Kids under 12 go free.', button: 'Get tickets' } },
  ],
}

const run = media('charity-run')
export const charityRun = {
  slug: 'charity-run',
  name: 'Charity Run 10K',
  category: 'events',
  description: 'An energetic fundraising page with a live-style progress bar and race details.',
  tags: ['fundraiser', 'sport', 'charity', 'run'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f4faf4', surface: '#ffffff', ink: '#0f2a1a', muted: '#4f6b5a', accent: '#12823b', accentInk: '#ffffff', inverseBg: '#0f2a1a', inverseInk: '#f4faf4' },
    fonts: { display: 'bricolage', body: 'inter' },
    type: { displayWeight: 800, displayCase: 'uppercase', displayTracking: '-0.03em', displayScale: 0.9 },
    radius: 'soft',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'cover', options: { align: 'start', overlay: 'gradient', height: 'full' },
      content: {
        eyebrow: 'Sunday 12 April · 9 am',
        title: 'Run 10K.\nRaise hope.',
        subtitle: 'Every kilometre supports the Riverside children’s library.',
        cta: 'Sign up to run',
        image: run('runner', 'A runner with a race number running along a city road'),
      },
    },
    {
      id: 'progress', type: 'progress', variant: 'bar', tone: 'surface',
      content: {
        eyebrow: 'Fundraising',
        title: 'Help us reach our goal',
        raised: '€12,840',
        goal: '€20,000',
        percent: 64,
        note: '312 runners and 1,140 donors so far. Thank you!',
      },
    },
    {
      // Race-day programme grid
      id: 'distances', type: 'timeline', variant: 'programme',
      content: {
        eyebrow: 'Race day',
        title: 'The programme',
        items: [
          { label: '7:30', title: 'Bag drop opens', text: 'In the park, by the library tent.' },
          { label: '9:00', title: '10K start', text: 'Chip-timed flat river loop, water every 2.5 km.' },
          { label: '9:20', title: '5K fun run', text: 'Families, walkers, strollers and dogs on leads.' },
          { label: '11:00', title: 'Music & medals', text: 'Food stalls, live music and story time.' },
        ],
      },
    },
    {
      // Runner ambassadors as people cards
      id: 'raceday', type: 'list', variant: 'people', tone: 'surface',
      content: {
        eyebrow: 'Running for the library',
        title: 'Meet our ambassadors',
        items: [
          { title: 'Ana', meta: '10K · first race', text: 'Running for the reading corner she grew up in.', image: run('runner', 'A runner with a race number on a city road') },
          { title: 'Jo & Sam', meta: '5K · together', text: 'Training every Sunday since January.', image: run('runners-pair', 'Two runners side by side') },
          { title: 'The river crew', meta: '10K · team', text: 'Twelve neighbours, one goal.', image: run('runners-river', 'Runners passing along a riverside road') },
        ],
      },
    },
    { id: 'cta', type: 'cta', variant: 'banner', tone: 'accent', content: { title: 'Every step counts', text: 'Can’t run? You can still help us reach the goal.', button: 'Donate' } },
  ],
}
