import { media } from './media.js'

/* ======================= Birthdays ======================= */

const confetti = media('confetti-pop')
export const confettiPop = {
  slug: 'confetti-pop',
  name: 'Confetti Pop',
  category: 'birthdays',
  description: 'A bright, playful party page with polaroid photos, stickers and confetti.',
  tags: ['party', 'colourful', 'kids', 'fun'],
  featured: true,
  status: 'available',
  theme: {
    colors: { bg: '#fff8ee', surface: '#ffffff', ink: '#2b1b54', muted: '#6b5a8e', accent: '#c73e69', accentInk: '#ffffff', inverseBg: '#2b1b54', inverseInk: '#fff8ee' },
    fonts: { display: 'fredoka', body: 'fredoka' },
    type: { displayWeight: 700, displayTracking: '-0.01em' },
    radius: 'round',
    ornament: 'confetti',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'collage',
      content: {
        eyebrow: 'You’re invited to',
        title: 'Leo’s\nSpace Party!',
        subtitle: 'Leo is turning 7 and the countdown has begun. Join us for rockets, cake and a backyard full of games.',
        cta: 'Count me in',
        images: [
          confetti('balloons-wall', 'A bunch of polka-dot balloons against a white brick wall'),
          confetti('cake-slice', 'A slice of rainbow sprinkle cake with a candle'),
          confetti('balloons', 'Colourful balloons filling the frame'),
        ],
      },
    },
    {
      id: 'details', type: 'details', variant: 'stickers',
      content: {
        items: [
          { label: 'When', value: 'Sat, May 9 · 2–5 pm' },
          { label: 'Where', value: '14 Maple Lane' },
          { label: 'Dress code', value: 'Space explorers' },
        ],
      },
    },
    { id: 'marquee', type: 'marquee', variant: 'band', tone: 'accent', content: { items: ['Rocket launch', 'Moon cake', 'Alien hunt', 'Star prizes', 'Face paint'] } },
    {
      id: 'plan', type: 'list', variant: 'columns',
      content: {
        eyebrow: 'The plan',
        title: 'Mission schedule',
        items: [
          { title: 'Lift-off', meta: '2:00 pm', text: 'Rocket races, bubble planets and a treasure hunt across the galaxy (the garden).' },
          { title: 'Moon cake', meta: '3:30 pm', text: 'Singing, candles and a cake shaped like the moon. Yes, really.' },
          { title: 'Star prizes', meta: '4:30 pm', text: 'Every astronaut goes home with a glow-in-the-dark goodie bag.' },
        ],
      },
    },
    {
      id: 'rsvp', type: 'cta', variant: 'banner', tone: 'inverse',
      content: { title: 'Can you make it, astronaut?', text: 'Let us know by May 1 so we can save you a space helmet.', button: 'Reply to Sam & Jo' },
    },
  ],
}

const golden = media('golden-thirty')
export const goldenThirty = {
  slug: 'golden-thirty',
  name: 'Golden Thirty',
  category: 'birthdays',
  motion: 'glamour', // slow shimmer for a black-tie milestone (otherwise birthdays are 'joyful')
  description: 'An elegant milestone invitation in midnight navy and champagne gold.',
  tags: ['milestone', 'elegant', 'dinner', '30th'],
  featured: true,
  status: 'available',
  theme: {
    colors: { bg: '#0d1326', surface: '#151d36', ink: '#f6efe0', muted: '#bfb49b', accent: '#d6a94e', accentInk: '#0d1326', line: 'rgba(214, 169, 78, 0.3)', inverseBg: '#f6efe0', inverseInk: '#0d1326' },
    fonts: { display: 'playfair', body: 'inter', script: 'playfair' },
    type: { displayWeight: 500, displayTracking: '-0.01em' },
    radius: 'none',
    ornament: 'stars',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'centered', content: { brand: 'M · 30', links: ['The evening', 'Menu', 'Dress', 'RSVP'] } },
    {
      id: 'hero', type: 'hero', variant: 'cover', options: { align: 'center', overlay: 'dark', ctaStyle: 'outline' },
      content: {
        eyebrow: 'An evening for',
        title: 'Maya\nat Thirty',
        subtitle: 'Dinner, music and old friends under the city lights.',
        meta: 'Saturday 18 October · 7:30 pm',
        cta: 'Reserve your seat',
        image: golden('champagne', 'Two glasses of champagne sparkling against a dark background'),
      },
    },
    {
      id: 'details', type: 'details', variant: 'inline',
      content: {
        items: [
          { label: 'Date', value: 'Saturday, 18 October' },
          { label: 'Venue', value: 'Sky Terrace, Lisbon' },
          { label: 'Dress', value: 'Black tie optional' },
        ],
      },
    },
    {
      id: 'evening', type: 'timeline', variant: 'schedule',
      content: {
        eyebrow: 'The evening',
        title: 'Order of the night',
        items: [
          { label: '7:30 pm', title: 'Champagne on the terrace', text: 'Arrive as the sun sets over the river.' },
          { label: '8:30 pm', title: 'Candlelit dinner', text: 'Four courses from Chef Inês, with wine pairings.' },
          { label: '10:00 pm', title: 'Live jazz & dancing', text: 'The Lisbon Quartet plays until late.' },
          { label: 'Midnight', title: 'Cake and a toast', text: 'To thirty years, and to all of you.' },
        ],
      },
    },
    {
      id: 'note', type: 'text', variant: 'split', tone: 'surface', options: { imageSide: 'right' },
      content: {
        eyebrow: 'A note from Maya',
        title: 'Thirty years, one table',
        body: 'Some of you have known me since I was missing my front teeth. Some of you met me last spring. All of you have made these thirty years brighter.\n\nI can’t think of a better way to begin the next chapter than with the people I love, a long dinner and far too much dancing.',
        image: golden('toast', 'Friends clinking champagne glasses in a toast'),
      },
    },
    { id: 'rsvp', type: 'cta', variant: 'signature', content: { title: 'Will you join me?', text: 'Kindly reply by 1 October.', button: 'RSVP' } },
  ],
}

/* ======================= Anniversaries ======================= */

const twenty = media('twenty-years')
export const twentyYears = {
  slug: 'twenty-years',
  name: 'Twenty Years',
  category: 'anniversaries',
  description: 'A warm story page celebrating two decades together, told year by year.',
  tags: ['timeline', 'romantic', 'family', 'milestone'],
  featured: true,
  status: 'available',
  theme: {
    colors: { bg: '#fbf4ef', surface: '#ffffff', ink: '#3a1d27', muted: '#86626f', accent: '#b4415f', accentInk: '#ffffff', inverseBg: '#3a1d27', inverseInk: '#fbf4ef' },
    fonts: { display: 'dm-serif', body: 'inter' },
    type: { displayWeight: 400, displayTracking: '-0.01em' },
    radius: 'soft',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'framed',
      content: {
        eyebrow: '2007–2027',
        title: 'Twenty years\nof us',
        subtitle: 'Ana & David invite you to celebrate two decades of love, laughter and burnt toast.',
        image: twenty('couple-walk', 'An older couple walking hand in hand down a city street', { caption: 'Still holding hands, Lisbon 2026' }),
      },
    },
    {
      id: 'numbers', type: 'stats', variant: 'big', tone: 'inverse',
      content: {
        eyebrow: 'By the numbers',
        items: [
          { value: '20', label: 'years married' },
          { value: '3', label: 'homes, one garden' },
          { value: '1', label: 'wonderful daughter' },
          { value: '∞', label: 'cups of coffee in bed' },
        ],
      },
    },
    {
      id: 'story', type: 'timeline', variant: 'vertical',
      content: {
        eyebrow: 'Our story',
        title: 'How we got here',
        items: [
          { label: '2007', title: 'A borrowed umbrella', text: 'A rainstorm, a shared umbrella and a coffee that lasted four hours.' },
          { label: '2012', title: 'A tiny flat, a big yes', text: 'David proposed on the balcony. Ana said yes before he finished.' },
          { label: '2018', title: 'Welcome, Clara', text: 'Our favourite chapter so far arrived on a Tuesday morning.' },
          { label: '2027', title: 'Still dancing in the kitchen', text: 'Twenty years on, we still save the last dance for each other.', image: twenty('couple-dinner', 'A couple smiling at each other over dinner') },
        ],
      },
    },
    { id: 'quote', type: 'quote', variant: 'large', tone: 'surface', content: { text: 'Grow old along with me! The best is yet to be.', author: 'Robert Browning' } },
    { id: 'invite', type: 'cta', variant: 'centered', content: { title: 'Join us for dinner', text: 'Saturday 22 May · Casa do Rio · 7 pm', button: 'Leave us a message' } },
  ],
}

const petals = media('paper-and-petals')
export const paperAndPetals = {
  slug: 'paper-and-petals',
  name: 'Paper & Petals',
  category: 'anniversaries',
  description: 'A cosy first-anniversary page with a handwritten letter and polaroid memories.',
  tags: ['first anniversary', 'handwritten', 'soft', 'letter'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#fdf7f1', surface: '#fffdfa', ink: '#47322b', muted: '#846b62', accent: '#915644', accentInk: '#ffffff', inverseBg: '#f1e4d8', inverseInk: '#47322b' },
    fonts: { display: 'fraunces', body: 'inter', script: 'caveat' },
    type: { displayWeight: 400, displayTracking: '-0.025em' },
    radius: 'round',
  },
  sections: [
    {
      id: 'hero', type: 'hero', variant: 'split', options: { imageSide: 'left', imageShape: 'arch' },
      content: {
        eyebrow: 'One year married',
        title: 'Paper\n& Petals',
        subtitle: 'Priya & Jonah, and a year of small adventures.',
        cta: 'Read our letter',
        image: petals('kitchen', 'A couple cooking together in a bright kitchen'),
      },
    },
    {
      id: 'letter', type: 'text', variant: 'letter', tone: 'inverse',
      content: {
        eyebrow: 'Dear friends',
        body: 'One year ago you danced with us until our feet hurt. Since then we have painted a flat, burnt a lot of toast and learned that Sunday mornings are sacred.\n\nThank you for every card, casserole and phone call. This little page is for you.',
        signature: 'Priya & Jonah',
      },
    },
    {
      id: 'memories', type: 'gallery', variant: 'polaroids',
      content: {
        title: 'Our first year',
        images: [
          petals('flowers-bed', 'Pink roses and a coffee cup on an unmade bed', { caption: 'Lazy Sundays' }),
          petals('kitchen-laugh', 'A couple laughing while preparing food', { caption: 'Burnt toast, again' }),
          petals('tulips', 'Pink tulips in a vase by a window', { caption: 'First spring' }),
        ],
      },
    },
    {
      id: 'details', type: 'details', variant: 'inline',
      content: {
        items: [
          { label: 'Married', value: 'April 2, 2026' },
          { label: 'First home', value: 'Porto' },
          { label: 'Favourite day', value: 'Every Sunday' },
        ],
      },
    },
    { id: 'note', type: 'cta', variant: 'signature', content: { title: 'Here’s to year two', button: 'Send us a note' } },
  ],
}
