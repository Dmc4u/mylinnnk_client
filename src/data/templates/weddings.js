import { media } from './media.js'

const garden = media('garden-vows')
export const gardenVows = {
  slug: 'garden-vows',
  name: 'Garden Vows',
  category: 'weddings',
  description: 'Romantic botanical line art, an arched portrait and graceful script lettering.',
  tags: ['romantic', 'botanical', 'script', 'outdoor'],
  featured: true,
  status: 'available',
  theme: {
    colors: { bg: '#f6f3ec', surface: '#fffdf8', ink: '#2f3a2f', muted: '#6f7a68', accent: '#7b8c62', accentInk: '#ffffff', inverseBg: '#3b4a37', inverseInk: '#f6f3ec' },
    fonts: { display: 'cormorant', body: 'cormorant', script: 'great-vibes' },
    type: { displayWeight: 500, displayTracking: '0', bodySize: '21px' },
    radius: 'soft',
    ornament: 'botanical',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'centered', content: { brand: 'S & A', links: ['Our story', 'Schedule', 'Travel', 'Gallery'] } },
    {
      id: 'hero', type: 'hero', variant: 'arch',
      content: {
        eyebrow: 'Together with their families',
        title: 'Sam & Alex',
        subtitle: 'are getting married',
        meta: 'June 14, 2027 · Quinta da Luz, Sintra',
        image: garden('bride-bouquet', 'A bride holding a bouquet of white and blush flowers', { focus: 'center' }),
      },
    },
    {
      id: 'countdown', type: 'countdown', variant: 'boxes', tone: 'surface',
      content: {
        eyebrow: 'Counting down',
        parts: [{ value: '214', unit: 'days' }, { value: '06', unit: 'hours' }, { value: '38', unit: 'minutes' }],
        note: 'Until we say “I do” in the rose garden.',
      },
    },
    {
      id: 'story', type: 'text', variant: 'split', options: { imageSide: 'left' },
      content: {
        eyebrow: 'Our story',
        title: 'It started on a rainy Tuesday',
        body: 'We met under the awning of a tiny bookshop in Lisbon, both waiting for the rain to stop. It didn’t, so we went for coffee instead.\n\nSix years, two cities and one very patient dog later, we can’t wait to celebrate with the people who made our story what it is.',
        image: garden('couple-bench', 'A couple sitting close on a garden bench in soft evening light'),
      },
    },
    {
      id: 'schedule', type: 'timeline', variant: 'schedule', tone: 'inverse',
      content: {
        eyebrow: 'The day',
        title: 'Wedding schedule',
        items: [
          { label: '3:00 pm', title: 'Ceremony', text: 'In the rose garden. Please arrive by 2:45.' },
          { label: '4:30 pm', title: 'Drinks & lawn games', text: 'Prosecco, croquet and a string quartet on the terrace.' },
          { label: '7:00 pm', title: 'Dinner & dancing', text: 'A long-table supper under the olive trees.' },
        ],
      },
    },
    {
      id: 'gallery', type: 'gallery', variant: 'mosaic',
      content: {
        eyebrow: 'Gallery',
        title: 'Little moments so far',
        images: [
          garden('bouquet-white', 'A white wildflower bouquet tied with lace'),
          garden('rings', 'A ring being placed on a hand'),
          garden('hands', 'Two hands with wedding rings resting on a bouquet'),
          garden('bouquet-grass', 'A bouquet of roses lying on the grass'),
          garden('couple-bench', 'A couple sitting together on a garden bench'),
        ],
      },
    },
    { id: 'rsvp', type: 'cta', variant: 'signature', content: { title: 'With love, Sam & Alex', text: 'Please let us know if you can join us by April 30.', button: 'Reply' } },
  ],
}

const coastal = media('coastal-evening')
export const coastalEvening = {
  slug: 'coastal-evening',
  name: 'Coastal Evening',
  category: 'weddings',
  description: 'A bold, modern destination wedding with sunset photography and clean type.',
  tags: ['beach', 'modern', 'destination', 'sunset'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f3f6f7', surface: '#ffffff', ink: '#0f2c3d', muted: '#5a7383', accent: '#e0794f', accentInk: '#ffffff', inverseBg: '#0f2c3d', inverseInk: '#f3f6f7' },
    fonts: { display: 'syne', body: 'inter' },
    type: { displayWeight: 700, displayCase: 'uppercase', displayTracking: '0', displayScale: 0.86 },
    radius: 'none',
    ornament: 'waves',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'Nadia + Tom', links: ['Weekend', 'Travel', 'Stay', 'FAQ'], cta: 'RSVP' } },
    {
      id: 'hero', type: 'hero', variant: 'split', options: { imageSide: 'right', imageShape: 'bleed' },
      content: {
        eyebrow: 'Save the date',
        title: 'Nadia\n+ Tom',
        subtitle: 'Sunset vows on the dunes, then supper by the sea.',
        meta: 'Praia do Guincho, Portugal',
        cta: 'Plan your trip',
        badge: '06 · 09 · 2027',
        image: coastal('sunset-rocks', 'The sun setting over a rocky beach'),
      },
    },
    {
      id: 'coast', type: 'gallery', variant: 'filmstrip', tone: 'inverse',
      content: {
        eyebrow: 'The coast',
        title: 'Where we’re getting married',
        images: [
          coastal('boats-sunset', 'Fishing boats on a calm sea at sunset'),
          coastal('dusk-shore', 'A quiet shoreline at dusk'),
          coastal('sunset-wave', 'A wave rolling in under an orange sky'),
          coastal('couple-lake', 'A couple sitting by the water at golden hour'),
        ],
      },
    },
    {
      id: 'weekend', type: 'details', variant: 'cards',
      content: {
        eyebrow: 'The weekend',
        title: 'Three days by the Atlantic',
        items: [
          { label: 'Friday', value: 'Welcome drinks at the beach bar' },
          { label: 'Saturday', value: 'Ceremony on the dunes at 5:30 pm' },
          { label: 'Sunday', value: 'Farewell brunch and a sea swim' },
        ],
      },
    },
    {
      id: 'travel', type: 'list', variant: 'numbered',
      content: {
        eyebrow: 'Travel',
        title: 'Getting here',
        items: [
          { title: 'Fly into Lisbon', text: 'Guincho is a 40-minute drive from the airport. We’ll run shuttles on Saturday.' },
          { title: 'Stay in Cascais', text: 'We’ve reserved rooms at three hotels a short walk from the old town.' },
          { title: 'Dress for sand', text: 'Linen, flat shoes and a warm layer for when the sun goes down.' },
        ],
      },
    },
    { id: 'rsvp', type: 'cta', variant: 'banner', tone: 'accent', content: { title: 'Join us on the coast', text: 'Please reply by July 1 so we can plan the seafood.', button: 'RSVP now' } },
  ],
}
