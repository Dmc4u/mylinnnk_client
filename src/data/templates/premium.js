import { media } from './media.js'

/**
 * Premium templates (November 2026 expansion). They reuse the bundled CC0 photos of the original
 * templates (credits in /public/template-media/credits.json); customers replace them with uploads.
 */
const coastal = media('coastal-evening')
const letters = media('letters-home')
const grad = media('graduation-day')
const summer = media('summer-sessions')
const twenty = media('twenty-years')
const golden = media('golden-thirty')
const confetti = media('confetti-pop')
const garden = media('garden-vows')
const petals = media('paper-and-petals')
const town = media('town-hall')
const mentor = media('mentor-circle')
const frame = media('frame-and-field')
const lisbon = media('year-in-lisbon')
const northwind = media('northwind-studio')
const mono = media('studio-mono')
const run = media('charity-run')
const baby = media('hello-baby')
const cafe = media('corner-cafe')

/* ======================= Birthdays ======================= */

/**
 * Golden Jubilee: a milestone birthday told in chapters (30th, 40th, 50th, 60th, 70th...). A sticky
 * chapter menu links to each part of the story (#section ids on the published page) and each chapter
 * ends with a button to the next one. Sample text is neutral; every heading, number and photo is editable.
 */
export const goldenJubilee = {
  slug: 'golden-jubilee',
  name: 'Golden Jubilee',
  category: 'birthdays',
  motion: 'glamour',
  description: 'A milestone birthday told in chapters, in royal gold, deep emerald and ivory.',
  tags: ['milestone', 'story', 'chapters', 'elegant', '50th', '60th'],
  featured: true,
  status: 'available',
  theme: {
    colors: {
      bg: '#fbf7ec',
      surface: '#f3ead4',
      ink: '#123d2f',
      muted: '#4c5f55',
      accent: '#8a6416',
      accentInk: '#fffaf0',
      line: 'rgba(138, 100, 22, 0.26)',
      inverseBg: '#0f3a2c',
      inverseInk: '#f7ecd0',
    },
    fonts: { display: 'playfair', body: 'cormorant', script: 'cormorant' },
    type: { displayWeight: 600, displayTracking: '-0.01em', bodySize: '21px' },
    radius: 'soft',
    ornament: 'none',
  },
  sections: [
    {
      id: 'nav',
      type: 'nav',
      variant: 'chapters',
      content: {
        brand: 'A Jubilee of Grace',
        items: [
          { label: 'Welcome', href: '#welcome' },
          { label: 'The Beginning', href: '#chapter-1' },
          { label: 'The Journey', href: '#chapter-2' },
          { label: 'Grace & Gratitude', href: '#chapter-3' },
          { label: 'My Next Chapter', href: '#next-chapter' },
          { label: 'Wishes', href: '#wishes' },
        ],
      },
    },
    {
      id: 'welcome',
      type: 'hero',
      variant: 'split',
      options: { imageSide: 'left', imageShape: 'arch' },
      content: {
        eyebrow: 'Celebrating a milestone',
        title: '60 Years\nof Grace',
        subtitle: 'A journey of love, faith and gratitude.',
        meta: 'Looking back over sixty years, I see grace in every chapter.',
        cta: 'Begin the story',
        ctaHref: '#chapter-1',
        image: coastal('sunset-rocks', 'The sun setting in gold over a quiet beach'),
      },
    },
    {
      id: 'chapter-1',
      type: 'text',
      variant: 'split',
      options: { imageSide: 'right' },
      content: {
        eyebrow: 'Chapter 1 · Childhood · School · Youth',
        title: 'The Beginning',
        body: 'Every story starts somewhere. Mine began in a home full of voices, with people who taught me what love and hard work look like.\n\nThrough school days, first friendships and the dreams of youth, I was guided and carried, even when I could not yet see the road ahead.',
        image: letters('family-sepia', 'An old sepia photograph of a large family gathered outdoors'),
        cta: 'Continue to Chapter 2',
        ctaHref: '#chapter-2',
      },
    },
    {
      id: 'chapter-2',
      type: 'text',
      variant: 'split',
      tone: 'surface',
      options: { imageSide: 'left' },
      content: {
        eyebrow: 'Chapter 2 · Family · Work · Growth',
        title: 'The Journey',
        body: 'The years brought study, work, new places and new beginnings. There were seasons of plenty and seasons of patience.\n\nAlong the way came the people who made the journey worthwhile: family, friends and companions who shared every step.',
        image: grad('graduates', 'Graduates in caps and gowns celebrating together'),
        cta: 'Continue to Chapter 3',
        ctaHref: '#chapter-3',
      },
    },
    {
      id: 'milestones',
      type: 'timeline',
      variant: 'years',
      tone: 'surface',
      content: {
        eyebrow: 'Along the way',
        title: 'Milestones',
        items: [
          { label: 'The 70s', title: 'A new beginning', text: 'Born into a family that welcomed me with joy.' },
          { label: 'The 80s', title: 'Learning and growing', text: 'School days, first lessons and lifelong friends.' },
          { label: 'The 90s', title: 'Stepping out', text: 'Studies, a first job and the courage to start.' },
          { label: 'The 2000s', title: 'Building a life', text: 'Family, work and a home full of memories.' },
          { label: 'Today', title: 'Sixty and grateful', text: 'Celebrating every chapter with the people I love.' },
        ],
      },
    },
    {
      id: 'chapter-3',
      type: 'text',
      variant: 'split',
      options: { imageSide: 'right' },
      content: {
        eyebrow: 'Chapter 3 · Reflection · Thanksgiving',
        title: 'Grace & Gratitude',
        body: 'Every experience, every lesson and every person along my path has helped shape who I am today.\n\nAt this milestone I don’t celebrate myself as much as the goodness that has brought me this far.',
        image: summer('hands', 'A raised hand silhouetted against warm golden light'),
        cta: 'Continue to my next chapter',
        ctaHref: '#next-chapter',
      },
    },
    {
      id: 'reflection',
      type: 'quote',
      variant: 'banner',
      tone: 'inverse',
      content: {
        text: 'There were difficult roads and uncertain moments, but grace carried me through every season.',
        author: 'A reflection at sixty',
      },
    },
    {
      id: 'moments',
      type: 'gallery',
      variant: 'polaroids',
      content: {
        eyebrow: 'Faces and places',
        title: 'Moments I’m grateful for',
        images: [
          letters('family-bw', 'A black-and-white photograph of a family with children', { caption: 'Where it all began' }),
          twenty('couple-walk', 'An older couple walking hand in hand down a street', { caption: 'Side by side' }),
          golden('toast', 'Two hands raising glasses in a toast', { caption: 'Every celebration' }),
        ],
      },
    },
    {
      id: 'next-chapter',
      type: 'text',
      variant: 'letter',
      tone: 'surface',
      content: {
        eyebrow: 'My next chapter',
        title: 'As I begin my next chapter…',
        body: 'For every breath, every blessing, every open door and every new day, I am thankful.\n\nI step into the years ahead with faith, hope and gratitude, and with all of you beside me.',
        signature: 'With love and gratitude',
      },
    },
    {
      id: 'years',
      type: 'stats',
      variant: 'big',
      tone: 'inverse',
      content: {
        eyebrow: 'One incredible journey',
        items: [
          { value: '60', label: 'years of grace' },
          { value: '3', label: 'chapters of life' },
          { value: '1', label: 'grateful heart' },
        ],
      },
    },
    {
      id: 'wishes',
      type: 'cta',
      variant: 'centered',
      content: {
        title: 'Thank you for being part of my story',
        text: 'Share a birthday wish, a memory or a photo. Every message will be treasured.',
        button: 'Send a birthday wish',
      },
    },
  ],
}

/** Neon Thirty: a full-screen party cover, modular tiles for the plan, a bento photo wall. */
export const neonThirty = {
  slug: 'neon-thirty',
  name: 'Neon Thirty',
  category: 'birthdays',
  motion: 'bold',
  description: 'A full-screen, after-dark party page with modular tiles and a bento photo wall.',
  tags: ['party', 'night', 'bold', '30th', 'dance'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#0b0a14', surface: '#16142a', ink: '#f4f1ff', muted: '#b3acd6', accent: '#ff4fd8', accentInk: '#14001a', line: 'rgba(244, 241, 255, 0.14)', inverseBg: '#f4f1ff', inverseInk: '#0b0a14' },
    fonts: { display: 'syne', body: 'space-grotesk' },
    type: { displayWeight: 800, displayCase: 'uppercase', displayTracking: '-0.02em' },
    radius: 'round',
    ornament: 'stars',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'cover', options: { height: 'full', align: 'start', overlay: 'gradient' },
      content: {
        eyebrow: 'Dirty thirty · One night only',
        title: 'Jade\nTurns 30',
        subtitle: 'Lights down, music up. Come dance into a new decade with me.',
        meta: 'Friday 12 June · 9 pm till late',
        cta: 'I’m coming',
        ctaHref: '#rsvp',
        image: summer('confetti-crowd', 'A crowd with raised hands under coloured lights and falling confetti'),
      },
    },
    {
      id: 'plan', type: 'list', variant: 'tiles',
      content: {
        eyebrow: 'The night',
        title: 'What’s happening',
        items: [
          { title: 'Welcome drinks on the roof', text: 'Neon cocktails and a skyline view to start the night.', meta: '9:00 pm' },
          { title: 'DJ set', text: 'Thirty years of songs, one dance floor.', meta: '10:00 pm' },
          { title: 'Cake at midnight', text: 'Thirty candles, one wish.', meta: '12:00 am' },
          { title: 'Dress code', text: 'Anything that glows.', meta: 'Bring the sparkle' },
          { title: 'Late bites', text: 'Street-food carts until 2 am.', meta: '1:00 am' },
        ],
      },
    },
    {
      id: 'photos', type: 'gallery', variant: 'bento', tone: 'surface',
      content: {
        eyebrow: 'Thirty years in pictures',
        title: 'The highlight reel',
        images: [
          golden('toast', 'Two hands raising glasses in a toast'),
          golden('champagne', 'Two glasses of champagne sparkling in the dark'),
          summer('stage', 'A stage glowing with coloured lights'),
          summer('guitarist', 'A guitarist performing under a spotlight'),
          confetti('balloons', 'Colourful balloons filling the frame'),
          lisbon('evening', 'A city street glowing at dusk'),
        ],
      },
    },
    {
      id: 'rsvp', type: 'cta', variant: 'banner', tone: 'accent',
      content: { title: 'Save your spot on the dance floor', text: 'Let me know by 1 June.', button: 'RSVP by email', buttonHref: 'mailto:party@example.com' },
    },
  ],
}

/** Ivory Editorial: a magazine-cover wedding with an alternating "our story" and a bento gallery. */
export const ivoryEditorial = {
  slug: 'ivory-editorial',
  name: 'Ivory Editorial',
  category: 'weddings',
  motion: 'editorial',
  description: 'A wedding page styled like a magazine cover, with an alternating love story and a bento gallery.',
  tags: ['magazine', 'modern', 'minimal', 'story', 'black-and-white'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f7f4ee', surface: '#ffffff', ink: '#1b1a17', muted: '#5f5b52', accent: '#7b5b3a', accentInk: '#ffffff', inverseBg: '#1b1a17', inverseInk: '#f7f4ee' },
    fonts: { display: 'dm-serif', body: 'inter' },
    type: { displayWeight: 400, displayTracking: '-0.03em' },
    radius: 'none',
    ornament: 'none',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'magazine',
      content: {
        eyebrow: 'The Wedding Issue',
        meta: 'Vol. 1 · 26 September',
        title: 'Amara\n& Theo',
        subtitle: 'Two people, one long table and the people we love most. Join us in the hills for a day we’ll remember forever.',
        cta: 'Read our story',
        ctaHref: '#story',
        images: [
          garden('couple-bench', 'A couple sitting close together on a garden bench'),
          garden('rings', 'Two wedding rings resting together'),
          garden('bouquet-white', 'A white bouquet of roses'),
        ],
      },
    },
    {
      id: 'story', type: 'timeline', variant: 'alternating',
      content: {
        eyebrow: 'Our story',
        title: 'How we got here',
        items: [
          { label: '2017', title: 'A borrowed umbrella', text: 'A rainy bus stop, one umbrella and a conversation that never really ended.', image: lisbon('street', 'A narrow city street after the rain') },
          { label: '2020', title: 'Home', text: 'A tiny flat, a lot of plants and our first dinner party for twelve.', image: petals('kitchen-laugh', 'Two people laughing while cooking together') },
          { label: '2025', title: 'The question', text: 'At the top of a mountain, out of breath, the easiest yes.', image: frame('peaks-dusk', 'Mountain peaks at dusk') },
        ],
      },
    },
    {
      id: 'details', type: 'details', variant: 'ticket', tone: 'surface',
      content: {
        eyebrow: 'The day',
        title: 'Save the date',
        note: 'Admit two',
        items: [
          { label: 'Date', value: 'Saturday, 26 September' },
          { label: 'Ceremony', value: '3:00 pm' },
          { label: 'Place', value: 'Olive Hill Estate' },
        ],
      },
    },
    {
      id: 'gallery', type: 'gallery', variant: 'bento',
      content: {
        eyebrow: 'Portfolio',
        title: 'Moments',
        images: [
          garden('bride-bouquet', 'A bride holding her bouquet'),
          garden('hands', 'Two hands held together'),
          garden('bouquet-grass', 'A bouquet resting in long grass'),
          coastal('couple-lake', 'A couple standing by a lake at sunset'),
          twenty('couple-dinner', 'A couple sharing dinner by candlelight'),
          coastal('dusk-shore', 'A calm shore at dusk'),
        ],
      },
    },
    {
      id: 'rsvp', type: 'cta', variant: 'centered', tone: 'inverse',
      content: { title: 'Will you join us?', text: 'Kindly reply by 1 August.', button: 'Reply by email', buttonHref: 'mailto:amara.theo@example.com' },
    },
  ],
}

/** Ruby Years: a 40th anniversary in framed portraits, decade-by-decade alternating rows. */
export const rubyYears = {
  slug: 'ruby-years',
  name: 'Ruby Years',
  category: 'anniversaries',
  motion: 'tender',
  description: 'A ruby anniversary told decade by decade, with framed portraits and alternating memories.',
  tags: ['40th', 'ruby', 'decades', 'family', 'classic'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#fff8f5', surface: '#f8e7e2', ink: '#3a0d14', muted: '#71474c', accent: '#9b1b30', accentInk: '#fff8f5', inverseBg: '#5c0f1c', inverseInk: '#fff1ec' },
    fonts: { display: 'cormorant', body: 'inter', script: 'great-vibes' },
    type: { displayWeight: 600, displayTracking: '-0.01em' },
    radius: 'soft',
    ornament: 'botanical',
    imageFilter: 'warm',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'centered', content: { brand: 'R & E · 40', links: ['Our decades', 'Photos', 'Celebrate'] } },
    {
      id: 'hero', type: 'hero', variant: 'framed',
      content: {
        eyebrow: 'Forty years of marriage',
        title: 'Rose & Emeka',
        subtitle: 'Married 14 May 1986 · still choosing each other every day',
        image: { ...twenty('couple-walk', 'An older couple walking hand in hand'), caption: 'Lagos, 1986 – today' },
      },
    },
    {
      id: 'decades', type: 'timeline', variant: 'alternating', tone: 'surface',
      content: {
        eyebrow: 'Four decades',
        title: 'Our decades',
        items: [
          { label: '1980s', title: 'The wedding', text: 'Two families, one dance floor and a cake that nearly fell over.', image: letters('family-sepia', 'An old sepia family photograph') },
          { label: '1990s', title: 'A full house', text: 'Three children, school runs and Sunday rice.', image: letters('family-bw', 'A black-and-white family photograph') },
          { label: '2000s', title: 'Growing up', text: 'Graduations, first jobs and a garden we finally finished.', image: grad('graduates', 'Graduates celebrating together') },
          { label: 'Today', title: 'Still dancing', text: 'Grandchildren, slow mornings and forty years of the same joke.', image: garden('hands', 'Two hands held together') },
        ],
      },
    },
    { id: 'quote', type: 'quote', variant: 'banner', tone: 'inverse', content: { text: 'Love is not something you find. It is something you build, every single day.', author: 'Rose, on our 40th' } },
    {
      id: 'celebrate', type: 'cta', variant: 'signature',
      content: { title: 'Join our ruby celebration', text: 'Thanksgiving service and lunch, Saturday 16 May.', button: 'Let us know you’re coming', buttonHref: 'mailto:family@example.com' },
    },
  ],
}

/** Civic Forward: a community leader’s page with a full-screen cover, priority tiles and a track record. */
export const civicForward = {
  slug: 'civic-forward',
  name: 'Civic Forward',
  category: 'leadership-community',
  motion: 'calm',
  description: 'A community leader’s page with priority tiles, impact numbers and an alternating track record.',
  tags: ['community', 'leader', 'campaign', 'impact', 'civic'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f5f8fb', surface: '#ffffff', ink: '#0d2340', muted: '#4b5d75', accent: '#0f6e5a', accentInk: '#ffffff', inverseBg: '#0d2340', inverseInk: '#f5f8fb' },
    fonts: { display: 'bricolage', body: 'inter' },
    type: { displayWeight: 700, displayTracking: '-0.03em' },
    radius: 'soft',
    ornament: 'none',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'Ngozi Okafor', links: ['Priorities', 'Record', 'Get involved'], cta: 'Volunteer' } },
    {
      id: 'hero', type: 'hero', variant: 'cover', options: { height: 'full', align: 'start', overlay: 'gradient', ctaStyle: 'inverse' },
      content: {
        eyebrow: 'Ward 7 community council',
        title: 'Building a ward\nthat works for all',
        subtitle: 'Safer streets, cleaner markets and a voice for every household.',
        cta: 'See my priorities',
        ctaHref: '#priorities',
        image: town('meeting', 'Neighbours gathered at a community meeting'),
      },
    },
    {
      id: 'priorities', type: 'list', variant: 'tiles',
      content: {
        eyebrow: 'Priorities',
        title: 'Five things I’ll deliver',
        items: [
          { title: 'Street lights on every road', text: 'Working lights within the first year, reported and fixed in a week.', meta: 'Safety' },
          { title: 'Clean markets', text: 'Daily waste collection and fair stall fees.', meta: 'Trade' },
          { title: 'Youth skills hub', text: 'Free evening classes in digital skills.', meta: 'Jobs' },
          { title: 'Open budget', text: 'Every naira published online.', meta: 'Trust' },
          { title: 'Monthly town halls', text: 'Ask me anything, in person.', meta: 'Voice' },
        ],
      },
    },
    {
      // The team, as people cards
      id: 'team', type: 'list', variant: 'people', tone: 'surface',
      content: {
        eyebrow: 'The team',
        title: 'Who you’ll be working with',
        items: [
          { title: 'Ngozi Okafor', meta: 'Councillor candidate', text: 'Teacher, trader’s daughter, ward resident for 20 years.', image: mentor('portrait', 'Portrait of a smiling woman outdoors') },
          { title: 'Musa Bello', meta: 'Community organiser', text: 'Runs the Saturday market clean-ups.', image: town('gardening', 'A volunteer watering newly planted shrubs') },
          { title: 'Youth council', meta: 'Volunteers', text: 'Eighty young people shaping the skills hub.', image: grad('graduates', 'Graduates celebrating together') },
        ],
      },
    },
    {
      id: 'impact', type: 'stats', variant: 'big', tone: 'inverse',
      content: { eyebrow: 'So far', items: [{ value: '120', label: 'street lights repaired' }, { value: '3', label: 'markets rebuilt' }, { value: '900', label: 'young people trained' }] },
    },
    {
      id: 'record', type: 'timeline', variant: 'alternating',
      content: {
        eyebrow: 'Track record',
        title: 'Ten years of showing up',
        items: [
          { label: '2016', title: 'Community garden', text: 'Turned an empty lot into food for 60 families.', image: town('gardening', 'A volunteer watering a community garden') },
          { label: '2020', title: 'Mentoring circle', text: 'Weekly mentoring for young entrepreneurs.', image: mentor('workshop-table', 'People working together around a table') },
          { label: '2024', title: 'Market renewal', text: 'Led the rebuild of the central market with traders.', image: cafe('bakery-shelves', 'Shelves of fresh bread in a bakery') },
        ],
      },
    },
    {
      id: 'join', type: 'cta', variant: 'banner', tone: 'accent',
      content: { title: 'Get involved', text: 'Volunteer, host a meeting or share an idea.', button: 'Volunteer by email', buttonHref: 'mailto:team@example.com' },
    },
  ],
}

/** Atelier Bloom: a florist’s shop on a magazine cover, a bento of arrangements and a price menu. */
export const atelierBloom = {
  slug: 'atelier-bloom',
  name: 'Atelier Bloom',
  category: 'business',
  motion: 'graceful',
  description: 'A boutique shop page with a magazine-style cover, a bento showcase and a price menu.',
  tags: ['florist', 'shop', 'boutique', 'menu', 'local business'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#fbf6f1', surface: '#f1e4da', ink: '#2e1f1a', muted: '#6e5a50', accent: '#a34a5a', accentInk: '#ffffff', inverseBg: '#2e1f1a', inverseInk: '#fbf6f1' },
    fonts: { display: 'fraunces', body: 'inter' },
    type: { displayWeight: 500, displayTracking: '-0.03em' },
    radius: 'round',
    ornament: 'botanical',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'Atelier Bloom', links: ['Arrangements', 'Prices', 'Visit'], cta: 'Order' } },
    {
      id: 'hero', type: 'hero', variant: 'magazine',
      content: {
        eyebrow: 'Seasonal flowers · Since 2019',
        meta: 'Open Tue–Sat',
        title: 'Flowers\nwith feeling',
        subtitle: 'Hand-tied bouquets, wedding florals and weekly subscriptions, arranged the morning you need them.',
        cta: 'Order a bouquet',
        ctaHref: '#visit',
        images: [
          petals('tulips', 'A bunch of pink tulips'),
          garden('bouquet-white', 'A white bouquet of roses'),
          petals('flowers-bed', 'A bed of colourful flowers'),
        ],
      },
    },
    {
      id: 'arrangements', type: 'gallery', variant: 'bento',
      content: {
        eyebrow: 'This season',
        title: 'Arrangements',
        images: [
          garden('bride-bouquet', 'A bridal bouquet', { caption: 'Bridal' }),
          petals('tulips', 'Pink tulips', { caption: 'Tulip bunch' }),
          garden('bouquet-grass', 'A bouquet in long grass', { caption: 'Wild & loose' }),
          petals('flowers-bed', 'Colourful garden flowers', { caption: 'Garden mix' }),
          garden('bouquet-white', 'White roses', { caption: 'Classic white' }),
          petals('kitchen', 'Flowers on a sunny kitchen table', { caption: 'Weekly subscription' }),
        ],
      },
    },
    {
      id: 'prices', type: 'list', variant: 'menu', tone: 'surface',
      content: {
        eyebrow: 'Prices',
        title: 'Bouquets & subscriptions',
        items: [
          { title: 'Hand-tied bouquet', meta: '₦25,000' },
          { title: 'Grand bouquet', meta: '₦45,000' },
          { title: 'Weekly flowers (4 weeks)', meta: '₦80,000' },
          { title: 'Wedding florals', meta: 'From ₦350,000' },
        ],
      },
    },
    {
      id: 'visit', type: 'contact', variant: 'columns',
      content: {
        eyebrow: 'Visit',
        title: 'Come and smell the roses',
        lines: [
          { label: 'Address', value: '12 Garden Row' },
          { label: 'Hours', value: 'Tue–Sat · 9 am–6 pm' },
          { label: 'Orders', value: 'hello@example.com' },
        ],
      },
    },
  ],
}

/** Gallery Wall: a photographer’s portfolio led by a bento grid of work. */
export const galleryWall = {
  slug: 'gallery-wall',
  name: 'Gallery Wall',
  category: 'portfolios',
  motion: 'editorial',
  description: 'A photographer’s portfolio with type-led headlines and a bento wall of work.',
  tags: ['photography', 'portfolio', 'landscape', 'grid', 'minimal'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#121212', surface: '#1c1c1c', ink: '#f5f5f2', muted: '#a8a8a2', accent: '#f2c14e', accentInk: '#121212', line: 'rgba(245, 245, 242, 0.12)', inverseBg: '#f5f5f2', inverseInk: '#121212' },
    fonts: { display: 'space-grotesk', body: 'inter' },
    type: { displayWeight: 500, displayTracking: '-0.04em' },
    radius: 'none',
    ornament: 'none',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'Kofi Mensah', links: ['Work', 'Series', 'Contact'] } },
    {
      id: 'hero', type: 'hero', variant: 'editorial',
      content: { eyebrow: 'Landscape & travel photographer', title: 'Light, distance\nand quiet places.', subtitle: 'Available for editorial and commercial commissions worldwide.', tags: ['Landscape', 'Travel', 'Editorial', 'Prints'] },
    },
    {
      id: 'work', type: 'gallery', variant: 'bento',
      content: {
        eyebrow: 'Selected work',
        title: 'Recent',
        images: [
          frame('peaks-dusk', 'Jagged peaks at dusk', { caption: 'Dolomites' }),
          frame('lake', 'A still mountain lake', { caption: 'Still water' }),
          frame('cliffs', 'Sea cliffs above the ocean', { caption: 'Atlantic edge' }),
          frame('cave-view', 'The view out of a cave toward the sea', { caption: 'Looking out' }),
          frame('mountain', 'A mountain above green meadows', { caption: 'High summer' }),
          coastal('sunset-rocks', 'Rocks on a beach at sunset', { caption: 'Golden hour' }),
        ],
      },
    },
    {
      id: 'series', type: 'list', variant: 'tiles', tone: 'surface',
      content: {
        eyebrow: 'Series',
        title: 'Ongoing projects',
        items: [
          { title: 'Edges', text: 'Where land stops and the sea begins: five years of coastlines.', meta: '2020–now' },
          { title: 'Thin air', text: 'Alpine light above 2,000 metres.', meta: '2023' },
          { title: 'City at rest', text: 'Streets in the hour before dawn.', meta: '2024' },
        ],
      },
    },
    {
      id: 'contact', type: 'cta', variant: 'banner',
      content: { title: 'Let’s make something', text: 'Commissions, licensing and fine-art prints.', button: 'Email me', buttonHref: 'mailto:studio@example.com' },
    },
  ],
}

/** Night Market: an event poster cover, a countdown, a bento of stalls and the line-up. */
export const nightMarket = {
  slug: 'night-market',
  name: 'Night Market',
  category: 'events',
  motion: 'bold',
  description: 'A festival page with a poster cover, a live-looking countdown, a bento of stalls and a line-up.',
  tags: ['festival', 'market', 'food', 'music', 'event'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#10131a', surface: '#1a1f2b', ink: '#fff7e8', muted: '#c4b9a3', accent: '#ffb547', accentInk: '#10131a', line: 'rgba(255, 247, 232, 0.14)', inverseBg: '#ffb547', inverseInk: '#10131a' },
    fonts: { display: 'bebas', body: 'space-grotesk' },
    type: { displayWeight: 400, displayCase: 'uppercase', displayTracking: '0.01em', displayScale: 1.15 },
    radius: 'soft',
    ornament: 'confetti',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'poster',
      content: { eyebrow: 'Three nights · Food · Music · Makers', title: 'Night\nMarket', subtitle: 'Sixty stalls, two stages and the best street food in town.', meta: '24–26 July · Harbour Square', image: golden('lantern', 'A glowing lantern in the dark') },
    },
    { id: 'countdown', type: 'countdown', variant: 'boxes', content: { eyebrow: 'Gates open in', parts: [{ value: '21', unit: 'days' }, { value: '06', unit: 'hours' }, { value: '30', unit: 'minutes' }], note: 'Free entry before 7 pm.' } },
    {
      id: 'stalls', type: 'gallery', variant: 'bento', tone: 'surface',
      content: {
        eyebrow: 'Eat, drink, browse',
        title: 'The stalls',
        images: [
          cafe('croissants', 'Fresh croissants piled high', { caption: 'Bakers' }),
          summer('stage', 'A lit stage at night', { caption: 'Main stage' }),
          cafe('latte-art', 'A latte with leaf art', { caption: 'Coffee' }),
          golden('toast', 'Two glasses raised', { caption: 'Drinks' }),
          summer('confetti-crowd', 'A crowd with confetti', { caption: 'Late shows' }),
          lisbon('evening', 'A street at dusk', { caption: 'Harbour Square' }),
        ],
      },
    },
    {
      id: 'lineup', type: 'list', variant: 'lineup',
      content: { eyebrow: 'Line-up', title: 'On stage', items: [{ title: 'The Lagoon Band', meta: 'Fri' }, { title: 'DJ Amaka', meta: 'Fri' }, { title: 'Highlife Collective', meta: 'Sat' }, { title: 'Sunset Choir', meta: 'Sun' }] },
    },
    {
      id: 'tickets', type: 'details', variant: 'cards', tone: 'inverse',
      content: { eyebrow: 'Plan your visit', title: 'Good to know', items: [{ label: 'Hours', value: '5 pm – midnight' }, { label: 'Entry', value: 'Free before 7 pm' }, { label: 'Getting there', value: 'Ferry & bus stop at the square' }] },
    },
  ],
}

/** Field Notes: a travel journal with a full-screen cover, alternating places and a bento of moments. */
export const fieldNotes = {
  slug: 'field-notes',
  name: 'Field Notes',
  category: 'personal-stories',
  motion: 'editorial',
  description: 'A travel journal with a full-screen cover, alternating places and a bento of small moments.',
  tags: ['travel', 'journal', 'adventure', 'story', 'photos'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f3efe6', surface: '#e8e1d2', ink: '#22261f', muted: '#5c6152', accent: '#2f6b4f', accentInk: '#ffffff', inverseBg: '#22261f', inverseInk: '#f3efe6' },
    fonts: { display: 'fraunces', body: 'inter', script: 'caveat' },
    type: { displayWeight: 600, displayTracking: '-0.02em' },
    radius: 'soft',
    ornament: 'waves',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'cover', options: { height: 'full', align: 'start', overlay: 'dark' },
      content: { eyebrow: 'Field notes · 42 days on the road', title: 'Mountains\nto the sea', subtitle: 'Four countries, three pairs of boots and one very old camera.', cta: 'Start reading', ctaHref: '#route', image: frame('mountain', 'A mountain above green meadows') },
    },
    {
      id: 'route', type: 'timeline', variant: 'alternating',
      content: {
        eyebrow: 'The route',
        title: 'Where the road went',
        items: [
          { label: 'Week 1', title: 'Into the mountains', text: 'Cold mornings, warm huts and the first blisters.', image: frame('peaks-dusk', 'Peaks at dusk') },
          { label: 'Week 3', title: 'The old city', text: 'Trams, tiled walls and pastries for breakfast every day.', image: lisbon('tram', 'A vintage tram on a city street') },
          { label: 'Week 6', title: 'The coast', text: 'Salt in my hair and nowhere to be.', image: frame('cliffs', 'Sea cliffs above the ocean') },
        ],
      },
    },
    {
      id: 'moments', type: 'gallery', variant: 'bento', tone: 'surface',
      content: {
        eyebrow: 'Small moments',
        title: 'From the notebook',
        images: [
          lisbon('rooftops', 'Rooftops over a hillside city'),
          lisbon('tram-red', 'A red tram'),
          frame('lake', 'A still lake'),
          coastal('boats-sunset', 'Boats at sunset'),
          letters('book', 'An open notebook with handwriting'),
          frame('cave-view', 'The view from a cave toward the sea'),
        ],
      },
    },
    { id: 'quote', type: 'quote', variant: 'large', content: { text: 'Not all those who wander are lost. Some of us are just looking for the next good café.', author: 'Page 112' } },
    { id: 'next', type: 'cta', variant: 'centered', tone: 'inverse', content: { title: 'Where should I go next?', text: 'Send me your favourite place.', button: 'Write to me', buttonHref: 'mailto:notes@example.com' } },
  ],
}

/* ======================= Batch 2 ======================= */

/** Scrapbook Sixteen: a collage cover, sticker details, polaroids and a scrolling band. */
export const scrapbookSixteen = {
  slug: 'scrapbook-sixteen',
  name: 'Scrapbook Sixteen',
  category: 'birthdays',
  motion: 'joyful',
  description: 'A scrapbook-style teen birthday with a photo collage, stickers, polaroids and a scrolling band.',
  tags: ['teen', '16th', 'scrapbook', 'collage', 'fun'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#fff4e6', surface: '#ffffff', ink: '#1f2a44', muted: '#55607a', accent: '#d6336c', accentInk: '#ffffff', inverseBg: '#1f2a44', inverseInk: '#fff4e6' },
    fonts: { display: 'caveat', body: 'bricolage', script: 'caveat' },
    type: { displayWeight: 700, displayTracking: '0', displayScale: 1.1 },
    radius: 'soft',
    ornament: 'confetti',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'collage',
      content: {
        eyebrow: 'Mark your calendar!',
        title: 'Zara is\nSweet 16',
        subtitle: 'Pizza, karaoke and way too many photos. You have to be there.',
        cta: 'Count me in',
        ctaHref: '#rsvp',
        images: [
          confetti('balloons-wall', 'Polka-dot balloons against a white wall'),
          lisbon('tram-red', 'A bright red tram'),
          summer('hands', 'A raised hand at a concert'),
        ],
      },
    },
    { id: 'details', type: 'details', variant: 'stickers', content: { items: [{ label: 'When', value: 'Sat 4 April · 4 pm' }, { label: 'Where', value: 'Starlight Karaoke' }, { label: 'Wear', value: 'Your best pink' }] } },
    { id: 'band', type: 'marquee', variant: 'band', tone: 'accent', content: { items: ['Karaoke', 'Pizza', 'Photo booth', 'Cake', 'Dancing'] } },
    {
      id: 'memories', type: 'gallery', variant: 'polaroids',
      content: {
        eyebrow: 'Sixteen years of',
        title: 'Throwbacks',
        images: [
          baby('feet', 'Tiny baby feet', { caption: 'Day one' }),
          confetti('cake-slice', 'A slice of sprinkle cake', { caption: 'Every birthday' }),
          lisbon('tram', 'A tram on a city street', { caption: 'Summer trip' }),
        ],
      },
    },
    { id: 'rsvp', type: 'cta', variant: 'banner', tone: 'inverse', content: { title: 'Can you make it?', text: 'Tell us by 25 March.', button: 'Reply to Zara’s mum', buttonHref: 'mailto:zara.party@example.com' } },
  ],
}

/** First Trip Around the Sun: a first birthday with an arched portrait and alternating months. */
export const firstTrip = {
  slug: 'first-trip',
  name: 'First Trip Around the Sun',
  category: 'birthdays',
  motion: 'tender',
  description: 'A soft first-birthday page with an arched portrait, a month-by-month story and a photo mosaic.',
  tags: ['1st birthday', 'baby', 'soft', 'family', 'milestones'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f6f9f4', surface: '#e7efe3', ink: '#24352b', muted: '#56665b', accent: '#3f7a5a', accentInk: '#ffffff', inverseBg: '#24352b', inverseInk: '#f6f9f4' },
    fonts: { display: 'fredoka', body: 'inter', script: 'caveat' },
    type: { displayWeight: 600, displayTracking: '-0.01em' },
    radius: 'pill',
    ornament: 'botanical',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'arch',
      content: { eyebrow: 'One whole year of', title: 'Little Ayo', subtitle: 'Join us to celebrate our first trip around the sun.', meta: 'Sunday 3 May · 1 pm · Grandma’s garden', image: baby('sleeping', 'A baby sleeping peacefully') },
    },
    {
      id: 'months', type: 'timeline', variant: 'alternating',
      content: {
        eyebrow: 'Twelve months',
        title: 'Look how you’ve grown',
        items: [
          { label: 'Month 1', title: 'Hello, world', text: 'Tiny fingers, big yawns and very little sleep.', image: baby('feet', 'Tiny baby feet') },
          { label: 'Month 6', title: 'First laugh', text: 'At the cat, of course.', image: petals('kitchen-laugh', 'Two people laughing in a kitchen') },
          { label: 'Month 12', title: 'First steps', text: 'Straight towards the cake.', image: confetti('cake-slice', 'A slice of birthday cake') },
        ],
      },
    },
    {
      id: 'photos', type: 'gallery', variant: 'mosaic', tone: 'surface',
      content: { eyebrow: 'Snapshots', title: 'Year one', images: [baby('sleeping', 'A sleeping baby'), confetti('balloons', 'Colourful balloons'), petals('flowers-bed', 'Garden flowers')] },
    },
    { id: 'rsvp', type: 'cta', variant: 'centered', content: { title: 'Come and celebrate with us', text: 'Little guests are very welcome.', button: 'Reply by email', buttonHref: 'mailto:family@example.com' } },
  ],
}

/** Riviera Weekend: a destination wedding over a weekend: full-screen cover, itinerary tiles, schedule. */
export const rivieraWeekend = {
  slug: 'riviera-weekend',
  name: 'Riviera Weekend',
  category: 'weddings',
  motion: 'graceful',
  description: 'A destination-wedding weekend with a full-screen coast cover, itinerary tiles and a filmstrip.',
  tags: ['destination', 'beach', 'weekend', 'itinerary', 'travel'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f4f8fa', surface: '#e3eef3', ink: '#0f2a3a', muted: '#4b6372', accent: '#1d6a8a', accentInk: '#ffffff', inverseBg: '#0f2a3a', inverseInk: '#f4f8fa' },
    fonts: { display: 'playfair', body: 'inter', script: 'great-vibes' },
    type: { displayWeight: 500, displayTracking: '-0.01em' },
    radius: 'soft',
    ornament: 'waves',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'chapters', content: { brand: 'L & S', items: [{ label: 'Weekend', href: '#weekend' }, { label: 'Schedule', href: '#schedule' }, { label: 'Travel', href: '#travel' }, { label: 'RSVP', href: '#rsvp' }] } },
    {
      id: 'hero', type: 'hero', variant: 'cover', options: { height: 'full', align: 'center', overlay: 'dark', ctaStyle: 'outline' },
      content: { eyebrow: 'Join us by the sea', title: 'Lina & Sam', subtitle: 'A wedding weekend on the coast.', meta: '18–20 June · Cape Coast', cta: 'Plan your weekend', ctaHref: '#weekend', image: coastal('sunset-wave', 'A wave breaking at sunset') },
    },
    {
      id: 'weekend', type: 'list', variant: 'tiles',
      content: {
        eyebrow: 'The weekend',
        title: 'Three days, one celebration',
        items: [
          { title: 'Welcome on the beach', text: 'Barefoot drinks and grilled fish as the sun goes down.', meta: 'Friday' },
          { title: 'The ceremony', text: 'Vows on the cliff, then dinner under the stars.', meta: 'Saturday' },
          { title: 'Farewell brunch', text: 'Coffee, pancakes and one last swim.', meta: 'Sunday' },
        ],
      },
    },
    {
      id: 'schedule', type: 'timeline', variant: 'schedule', tone: 'surface',
      content: { eyebrow: 'Saturday', title: 'The big day', items: [{ label: '3:00 pm', title: 'Ceremony', text: 'On the cliff path.' }, { label: '5:00 pm', title: 'Golden-hour drinks', text: 'On the terrace.' }, { label: '7:30 pm', title: 'Dinner & dancing', text: 'Until the band stops.' }] },
    },
    {
      id: 'film', type: 'gallery', variant: 'filmstrip',
      content: { eyebrow: 'The coast', title: 'Where we’ll be', images: [coastal('boats-sunset', 'Boats at sunset'), coastal('dusk-shore', 'A shore at dusk'), coastal('sunset-rocks', 'Rocks at sunset'), frame('cliffs', 'Sea cliffs')] },
    },
    { id: 'travel', type: 'details', variant: 'inline', content: { eyebrow: 'Travel', title: 'Getting there', items: [{ label: 'Fly to', value: 'Accra (ACC)' }, { label: 'Then', value: '3 hours by shuttle' }, { label: 'Stay', value: 'Rooms held until 1 May' }] } },
    { id: 'rsvp', type: 'cta', variant: 'banner', tone: 'inverse', content: { title: 'Will you join us?', text: 'Reply by 1 April so we can book your shuttle.', button: 'RSVP by email', buttonHref: 'mailto:lina.sam@example.com' } },
  ],
}

/** City Hall Vows: a small modern wedding: type-only cover, cards, polaroids and a letter. */
export const cityHallVows = {
  slug: 'city-hall-vows',
  name: 'City Hall Vows',
  category: 'weddings',
  motion: 'calm',
  description: 'A small, modern city wedding: a type-only cover, detail cards, polaroids and a handwritten note.',
  tags: ['small wedding', 'modern', 'minimal', 'city', 'elopement'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#ffffff', surface: '#f2f2f2', ink: '#111111', muted: '#555555', accent: '#c2410c', accentInk: '#ffffff', inverseBg: '#111111', inverseInk: '#ffffff' },
    fonts: { display: 'inter', body: 'inter', script: 'caveat' },
    type: { displayWeight: 300, displayTracking: '-0.05em', displayScale: 1.1 },
    radius: 'none',
    ornament: 'none',
  },
  sections: [
    { id: 'hero', type: 'hero', variant: 'editorial', content: { eyebrow: 'We’re getting married', title: 'Ife + Dami.\nCity Hall. Then lunch.', subtitle: 'Small, simple and full of the people we love.', tags: ['Friday 9 October', '11 am', 'City Hall, Room 3'] } },
    { id: 'details', type: 'details', variant: 'cards', tone: 'surface', content: { eyebrow: 'Details', title: 'The plan', items: [{ label: 'Ceremony', value: '11 am · City Hall' }, { label: 'Lunch', value: '1 pm · The Corner Table' }, { label: 'Dress', value: 'Whatever makes you smile' }] } },
    {
      id: 'photos', type: 'gallery', variant: 'polaroids',
      content: { eyebrow: 'Us', title: 'A few favourites', images: [garden('rings', 'Two wedding rings', { caption: 'Yes!' }), cafe('latte', 'A latte on a café table', { caption: 'First date' }), lisbon('street', 'A city street', { caption: 'Our street' })] },
    },
    { id: 'note', type: 'text', variant: 'letter', content: { eyebrow: 'A note from us', title: 'Dear friends,', body: 'We wanted something small and real, with the people who matter most.\n\nThank you for being one of them.', signature: 'Ife & Dami' } },
    { id: 'rsvp', type: 'cta', variant: 'centered', tone: 'inverse', content: { title: 'Lunch is on us', text: 'Let us know by 20 September.', button: 'Reply', buttonHref: 'mailto:ife.dami@example.com' } },
  ],
}

/** Still Us: an anniversary in split-screen portraits, a masonry wall, a letter and numbers. */
export const stillUs = {
  slug: 'still-us',
  name: 'Still Us',
  category: 'anniversaries',
  motion: 'graceful',
  description: 'A split-screen anniversary page with a masonry photo wall, a love letter and the numbers that matter.',
  tags: ['anniversary', 'love letter', 'couple', 'photos', 'modern'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f7f3f8', surface: '#ece3ef', ink: '#2b1d33', muted: '#5f5068', accent: '#7a3e8f', accentInk: '#ffffff', inverseBg: '#2b1d33', inverseInk: '#f7f3f8' },
    fonts: { display: 'playfair', body: 'inter', script: 'great-vibes' },
    type: { displayWeight: 500, displayTracking: '-0.02em' },
    radius: 'round',
    ornament: 'stars',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'split', options: { imageSide: 'right', imageShape: 'circle' },
      content: { eyebrow: 'Ten years later', title: 'Still us.', subtitle: 'A decade of inside jokes, road trips and Sunday pancakes.', meta: 'Married 2 August 2016', badge: '10', image: twenty('couple-dinner', 'A couple sharing dinner by candlelight') },
    },
    {
      id: 'wall', type: 'gallery', variant: 'masonry',
      content: {
        eyebrow: 'Ten years',
        title: 'Our photo wall',
        images: [
          coastal('couple-lake', 'A couple by a lake'),
          twenty('couple-walk', 'A couple walking hand in hand'),
          garden('hands', 'Two hands held together'),
          petals('kitchen-laugh', 'Laughing in the kitchen'),
          lisbon('rooftops', 'City rooftops'),
          coastal('boats-sunset', 'Boats at sunset'),
        ],
      },
    },
    { id: 'letter', type: 'text', variant: 'letter', tone: 'surface', content: { eyebrow: 'To you', title: 'My love,', body: 'Ten years ago I promised to stay. It turns out that was the easiest promise I ever made.\n\nHere’s to the next ten.', signature: 'Always, D.' } },
    { id: 'numbers', type: 'stats', variant: 'big', content: { eyebrow: 'By the numbers', items: [{ value: '10', label: 'years married' }, { value: '14', label: 'countries together' }, { value: '520', label: 'Sunday pancakes' }] } },
  ],
}

/** Ledger & Co.: a consultancy with a split hero, service tiles, results and a client quote. */
export const ledgerAndCo = {
  slug: 'ledger-and-co',
  name: 'Ledger & Co.',
  category: 'business',
  motion: 'calm',
  description: 'A professional-services page with modular service tiles, results in numbers and a client quote.',
  tags: ['consulting', 'finance', 'professional', 'services', 'b2b'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f6f7f9', surface: '#ffffff', ink: '#14213d', muted: '#4d5870', accent: '#1f4fd1', accentInk: '#ffffff', inverseBg: '#14213d', inverseInk: '#f6f7f9' },
    fonts: { display: 'space-grotesk', body: 'inter' },
    type: { displayWeight: 600, displayTracking: '-0.04em' },
    radius: 'soft',
    ornament: 'none',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'Ledger & Co.', links: ['Services', 'Results', 'Contact'], cta: 'Book a call' } },
    {
      id: 'hero', type: 'hero', variant: 'split', options: { imageSide: 'right', imageShape: 'rect' },
      content: { eyebrow: 'Accounting & advisory for small businesses', title: 'Clear numbers.\nCalm decisions.', subtitle: 'Bookkeeping, tax and cash-flow planning from people who answer the phone.', cta: 'Book a free call', ctaHref: '#contact', image: northwind('laptop-coffee', 'A laptop and coffee on a desk') },
    },
    {
      id: 'services', type: 'list', variant: 'tiles', tone: 'surface',
      content: {
        eyebrow: 'Services',
        title: 'What we do',
        items: [
          { title: 'Monthly bookkeeping', text: 'Every transaction reconciled, every month, with a one-page summary.', meta: 'From ₦60,000 / month' },
          { title: 'Tax returns', text: 'Filed on time, explained in plain words.', meta: 'Fixed fee' },
          { title: 'Cash-flow planning', text: 'A 12-month forecast you can actually use.', meta: 'Quarterly' },
          { title: 'Payroll', text: 'Accurate, on time, every time.', meta: 'Per employee' },
          { title: 'Advisory', text: 'A finance partner for big decisions.', meta: 'By the hour' },
        ],
      },
    },
    { id: 'results', type: 'stats', variant: 'cards', tone: 'inverse', content: { eyebrow: 'Results', items: [{ value: '180', label: 'businesses served' }, { value: '12', label: 'years in practice' }, { value: '98', label: 'per cent stay with us' }] } },
    { id: 'quote', type: 'quote', variant: 'large', content: { text: 'For the first time, I understand my own numbers.', author: 'Owner, a family bakery' } },
    { id: 'contact', type: 'contact', variant: 'columns', content: { eyebrow: 'Contact', title: 'Let’s talk', lines: [{ label: 'Email', value: 'hello@example.com' }, { label: 'Phone', value: '+234 800 000 0000' }, { label: 'Office', value: 'Mon–Fri · 8 am–5 pm' }] } },
  ],
}

/** Fieldhouse: a fitness studio with a full-screen cover, class tiles, a timetable and a band. */
export const fieldhouse = {
  slug: 'fieldhouse',
  name: 'Fieldhouse',
  category: 'business',
  motion: 'bold',
  description: 'A high-energy studio page with a full-screen cover, class tiles, a weekly timetable and a scrolling band.',
  tags: ['fitness', 'gym', 'studio', 'classes', 'sport'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#0f1110', surface: '#1a1d1b', ink: '#f2f5f0', muted: '#a9b3aa', accent: '#c6f432', accentInk: '#0f1110', line: 'rgba(242, 245, 240, 0.12)', inverseBg: '#c6f432', inverseInk: '#0f1110' },
    fonts: { display: 'bebas', body: 'inter' },
    type: { displayWeight: 400, displayCase: 'uppercase', displayTracking: '0.02em', displayScale: 1.15 },
    radius: 'none',
    ornament: 'none',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'Fieldhouse', links: ['Classes', 'Timetable', 'Join'], cta: 'Free class' } },
    {
      id: 'hero', type: 'hero', variant: 'cover', options: { height: 'full', align: 'start', overlay: 'dark' },
      content: { eyebrow: 'Strength · Running · Mobility', title: 'Train like\nyou mean it', subtitle: 'Small classes, real coaching and a community that shows up.', cta: 'Book a free class', ctaHref: '#join', image: run('runners-river', 'Runners along a river at dawn') },
    },
    { id: 'band', type: 'marquee', variant: 'band', tone: 'inverse', content: { items: ['Strength', 'Run club', 'Mobility', 'HIIT', 'Open gym'] } },
    {
      id: 'classes', type: 'list', variant: 'tiles',
      content: {
        eyebrow: 'Classes',
        title: 'Find your thing',
        items: [
          { title: 'Strength 101', text: 'Learn the big lifts safely, with a coach beside you.', meta: '45 min', image: run('runners-pair', 'Two athletes training side by side') },
          { title: 'Run club', text: 'Every pace welcome. Coffee after.', meta: '5 km', image: run('runners-river', 'Runners along a river at dawn') },
          { title: 'Mobility', text: 'Move better, hurt less.', meta: '30 min', image: frame('lake', 'A calm mountain lake') },
          { title: 'HIIT', text: 'Short, sharp and done.', meta: '30 min', image: run('runner', 'A runner mid-stride on a city road') },
        ],
      },
    },
    { id: 'timetable', type: 'timeline', variant: 'programme', tone: 'surface', content: { eyebrow: 'Timetable', title: 'This week', items: [{ label: 'Mon & Wed', title: 'Strength 101', text: '6:30 am · 6 pm' }, { label: 'Tue & Thu', title: 'HIIT', text: '7 am · 7 pm' }, { label: 'Saturday', title: 'Run club', text: '7 am from the river gate' }] } },
    { id: 'join', type: 'cta', variant: 'banner', tone: 'accent', content: { title: 'Your first class is free', text: 'No contract. Just come and try.', button: 'Call to book', buttonHref: 'tel:+2348000000000' } },
  ],
}

/** Case Study: a designer’s portfolio as a magazine: alternating projects and skill tiles. */
export const caseStudy = {
  slug: 'case-study',
  name: 'Case Study',
  category: 'portfolios',
  motion: 'editorial',
  description: 'A designer’s portfolio styled as a magazine, with alternating project stories and skill tiles.',
  tags: ['designer', 'product', 'case study', 'portfolio', 'magazine'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#fafaf7', surface: '#efeee8', ink: '#16161a', muted: '#55555c', accent: '#5b3cc4', accentInk: '#ffffff', inverseBg: '#16161a', inverseInk: '#fafaf7' },
    fonts: { display: 'syne', body: 'inter' },
    type: { displayWeight: 700, displayTracking: '-0.03em' },
    radius: 'soft',
    ornament: 'none',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'magazine',
      content: {
        eyebrow: 'Product designer · Lagos & remote',
        meta: 'Portfolio 2026',
        title: 'Design that\nfeels obvious',
        subtitle: 'I help teams turn complicated products into calm, useful ones. Eight years, forty launches.',
        cta: 'See the work',
        ctaHref: '#projects',
        images: [northwind('desk', 'A tidy design desk'), northwind('brand-flatlay', 'Brand materials laid out on a table'), mono('desk-light', 'A desk lamp lighting a workspace')],
      },
    },
    {
      id: 'projects', type: 'timeline', variant: 'alternating',
      content: {
        eyebrow: 'Selected projects',
        title: 'Case studies',
        items: [
          { label: '01', title: 'A savings app people open daily', text: 'Redesigned onboarding: sign-ups up 38 per cent in a quarter.', image: northwind('laptop-coffee', 'A laptop beside a coffee') },
          { label: '02', title: 'A clinic booking system', text: 'From six phone calls to one tap for 40,000 patients.', image: mentor('workshop-notes', 'Notes from a design workshop') },
          { label: '03', title: 'A brand for a bakery chain', text: 'Identity, packaging and a menu people photograph.', image: cafe('croissant-plate', 'A croissant on a plate') },
        ],
      },
    },
    { id: 'skills', type: 'list', variant: 'tiles', tone: 'surface', content: { eyebrow: 'How I can help', title: 'Skills', items: [{ title: 'Product strategy', text: 'Finding the problem worth solving.', meta: 'Discovery' }, { title: 'Interaction design', text: 'Flows, prototypes and testing.', meta: 'Figma' }, { title: 'Design systems', text: 'Components teams love to use.', meta: 'Scale' }] } },
    { id: 'contact', type: 'cta', variant: 'signature', tone: 'inverse', content: { title: 'Have a product that needs a calmer design?', button: 'Start a conversation', buttonHref: 'mailto:hello@example.com' } },
  ],
}

/** Ink & Line: an illustrator’s collage cover, masonry work wall and services in columns. */
export const inkAndLine = {
  slug: 'ink-and-line',
  name: 'Ink & Line',
  category: 'portfolios',
  motion: 'joyful',
  description: 'An illustrator’s playful portfolio with a collage cover, a masonry wall of work and services in columns.',
  tags: ['illustration', 'artist', 'creative', 'collage', 'colourful'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#fffdf5', surface: '#fff1c9', ink: '#1d1b16', muted: '#5a554a', accent: '#b4361f', accentInk: '#ffffff', inverseBg: '#1d1b16', inverseInk: '#fffdf5' },
    fonts: { display: 'bricolage', body: 'inter', script: 'caveat' },
    type: { displayWeight: 800, displayTracking: '-0.04em' },
    radius: 'round',
    ornament: 'confetti',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'centered', content: { brand: 'Ink & Line', links: ['Work', 'Services', 'Say hi'] } },
    {
      id: 'hero', type: 'hero', variant: 'collage',
      content: { eyebrow: 'Illustrator & muralist', title: 'Drawing the\neveryday', subtitle: 'Books, walls, brands and the occasional birthday card.', cta: 'Commission me', ctaHref: '#hello', images: [mono('cafe-table', 'A café table from above'), letters('book', 'An open notebook'), petals('tulips', 'Pink tulips')] },
    },
    {
      id: 'work', type: 'gallery', variant: 'masonry',
      content: { eyebrow: 'Work', title: 'From the sketchbook', images: [letters('envelope', 'A handwritten envelope'), mono('dark-coffee', 'A dark coffee'), lisbon('tram-red', 'A red tram'), cafe('latte-art', 'Latte art'), petals('flowers-bed', 'Garden flowers'), lisbon('belem', 'An ornate stone tower')] },
    },
    { id: 'services', type: 'list', variant: 'columns', tone: 'surface', content: { eyebrow: 'Services', title: 'What I make', items: [{ title: 'Book covers', text: 'For novels, picture books and everything between.' }, { title: 'Murals', text: 'Cafés, schools and very brave homeowners.' }, { title: 'Brand illustration', text: 'A drawn world for your brand.' }] } },
    { id: 'hello', type: 'cta', variant: 'banner', tone: 'accent', content: { title: 'Got a wall or a story?', text: 'I take four commissions a season.', button: 'Say hi', buttonHref: 'mailto:studio@example.com' } },
  ],
}
