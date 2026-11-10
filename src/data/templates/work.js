import { media } from './media.js'

/* ======================= Leadership & Community ======================= */

const town = media('town-hall')
export const townHall = {
  slug: 'town-hall',
  name: 'Town Hall',
  category: 'leadership-community',
  description: 'A clear, trustworthy page for community initiatives, with impact numbers up front.',
  tags: ['community', 'campaign', 'nonprofit', 'civic'],
  featured: true,
  status: 'available',
  theme: {
    colors: { bg: '#f4f7fb', surface: '#ffffff', ink: '#0b1d3a', muted: '#55637d', accent: '#1d4ed8', accentInk: '#ffffff', inverseBg: '#0b1d3a', inverseInk: '#f4f7fb' },
    fonts: { display: 'bricolage', body: 'inter' },
    type: { displayWeight: 700, displayTracking: '-0.035em' },
    radius: 'soft',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'Greener Riverside', links: ['Projects', 'Events', 'About'], cta: 'Volunteer' } },
    {
      id: 'hero', type: 'hero', variant: 'split', options: { imageSide: 'right', imageShape: 'rect' },
      content: {
        eyebrow: 'Community initiative',
        title: 'Cleaner streets.\nGreener parks.\nStronger neighbours.',
        subtitle: 'Join residents improving Riverside one Saturday at a time.',
        cta: 'Join a clean-up',
        badge: '400+ volunteers',
        image: town('gardening', 'A volunteer watering newly planted shrubs'),
      },
    },
    {
      id: 'impact', type: 'stats', variant: 'big', tone: 'accent',
      content: {
        items: [
          { value: '12', label: 'parks restored with local volunteers' },
          { value: '3,200', label: 'trees planted along the river path' },
          { value: '48', label: 'Saturday clean-ups since 2023' },
        ],
      },
    },
    {
      id: 'programmes', type: 'list', variant: 'numbered',
      content: {
        eyebrow: 'What we do',
        title: 'Three ways to get involved',
        items: [
          { title: 'Saturday clean-ups', text: 'Two hours, gloves provided, coffee guaranteed. Every second Saturday.' },
          { title: 'Tree planting', text: 'Help us plant 1,000 native trees along the river this autumn.' },
          { title: 'Open meetings', text: 'Share ideas and vote on next year’s projects. Everyone is welcome.' },
        ],
      },
    },
    {
      id: 'meetings', type: 'text', variant: 'split', tone: 'surface', options: { imageSide: 'left' },
      content: {
        eyebrow: 'Open meetings',
        title: 'Every first Tuesday at the library',
        body: 'We plan everything together. Bring a neighbour, bring an idea, or just come for the biscuits.\n\nMeetings start at 7 pm in the Riverside Library community room and finish by 8:30.',
        cta: 'See the agenda',
        image: town('meeting', 'Neighbours gathered around a long table at a community meeting'),
      },
    },
    { id: 'join', type: 'cta', variant: 'banner', tone: 'inverse', content: { title: 'Riverside is better together', text: 'Next clean-up: Saturday at 9 am, meet at the river path.', button: 'Count me in' } },
  ],
}

const mentor = media('mentor-circle')
export const mentorCircle = {
  slug: 'mentor-circle',
  name: 'Mentor Circle',
  category: 'leadership-community',
  description: 'A calm, credible profile for coaches, mentors and speakers.',
  tags: ['speaker', 'coach', 'mentor', 'profile'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f7f4ee', surface: '#ffffff', ink: '#1f1b16', muted: '#6c645a', accent: '#6d28d9', accentInk: '#ffffff', inverseBg: '#1f1b16', inverseInk: '#f7f4ee' },
    fonts: { display: 'dm-serif', body: 'inter' },
    type: { displayWeight: 400, displayTracking: '-0.015em' },
    radius: 'round',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'Elena Marsh', links: ['About', 'Programmes', 'Speaking'], cta: 'Book a call' } },
    {
      id: 'hero', type: 'hero', variant: 'split', options: { imageSide: 'left', imageShape: 'circle' },
      content: {
        eyebrow: 'Leadership coach & speaker',
        title: 'Helping first-time leaders find their voice.',
        subtitle: 'Workshops, keynotes and one-to-one mentoring for growing teams.',
        cta: 'Book a free call',
        image: mentor('portrait', 'Portrait of a smiling woman outdoors'),
      },
    },
    { id: 'praise', type: 'quote', variant: 'banner', tone: 'inverse', content: { text: 'Elena helped our new managers lead with confidence and kindness.', author: 'Head of People, Northwind Studio' } },
    {
      id: 'programmes', type: 'list', variant: 'columns',
      content: {
        eyebrow: 'Programmes',
        title: 'Ways we can work together',
        items: [
          { title: 'Keynotes', meta: '45–60 minutes', text: 'Energising talks on confident, kind leadership for conferences and offsites.' },
          { title: 'Workshops', meta: 'Half or full day', text: 'Hands-on sessions for new managers, built around real situations.' },
          { title: 'Mentoring', meta: 'Six weeks', text: 'One-to-one sessions with a clear plan and honest feedback.' },
        ],
      },
    },
    {
      id: 'workshops', type: 'text', variant: 'split', options: { imageSide: 'right' },
      content: {
        eyebrow: 'Workshops',
        title: 'Practical, warm and a little bit playful',
        body: 'Every workshop starts with the challenges your team actually faces. We practise difficult conversations, plan the first 90 days and leave with a toolkit people use the next morning.',
        image: mentor('workshop-notes', 'A wall of colourful sticky notes from a workshop'),
      },
    },
    {
      id: 'contact', type: 'contact', variant: 'columns', tone: 'surface',
      content: {
        eyebrow: 'Get in touch',
        title: 'Let’s talk about your team',
        lines: [
          { label: 'Email', value: 'elena@example.com' },
          { label: 'Based in', value: 'Porto & online' },
          { label: 'Availability', value: 'From September 2027' },
          { label: 'Languages', value: 'English, Portuguese' },
        ],
      },
    },
  ],
}

/* ======================= Business ======================= */

const northwind = media('northwind-studio')
export const northwindStudio = {
  slug: 'northwind-studio',
  name: 'Northwind Studio',
  category: 'business',
  description: 'A dark, editorial studio site with oversized type and a project showcase.',
  tags: ['agency', 'studio', 'portfolio', 'dark'],
  featured: true,
  status: 'available',
  theme: {
    colors: { bg: '#0b0f14', surface: '#131a22', ink: '#eef2f5', muted: '#8b98a5', accent: '#2dd4bf', accentInk: '#06201d', line: 'rgba(238, 242, 245, 0.12)', inverseBg: '#eef2f5', inverseInk: '#0b0f14' },
    fonts: { display: 'space-grotesk', body: 'space-grotesk' },
    type: { displayWeight: 500, displayTracking: '-0.045em' },
    radius: 'none',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'Northwind®', links: ['Work', 'Studio', 'Services', 'Contact'], cta: 'Start a project' } },
    {
      id: 'hero', type: 'hero', variant: 'editorial',
      content: {
        eyebrow: 'Brand & digital studio · Lisbon',
        title: 'We make brave\nbrands feel\nfamiliar.',
        subtitle: 'Identity, websites and campaigns for independent businesses since 2016.',
        tags: ['Branding', 'Web design', 'Campaigns', 'Art direction'],
      },
    },
    { id: 'marquee', type: 'marquee', variant: 'band', tone: 'accent', content: { items: ['Identity', 'Packaging', 'Websites', 'Motion', 'Campaigns'] } },
    {
      id: 'work', type: 'gallery', variant: 'mosaic',
      content: {
        eyebrow: 'Selected work',
        title: 'Recent projects',
        images: [
          northwind('brand-flatlay', 'Printed brand guidelines and stationery on a desk', { caption: 'Atlas Coffee · Identity' }),
          northwind('desk', 'A minimal desk with a laptop in a dark room', { caption: 'Halden · Website' }),
          northwind('laptop-coffee', 'A laptop and a cup of coffee on a wooden table', { caption: 'Ferro · Campaign' }),
        ],
      },
    },
    {
      id: 'numbers', type: 'stats', variant: 'big',
      content: {
        items: [
          { value: '120+', label: 'brands launched' },
          { value: '9', label: 'years in business' },
          { value: '14', label: 'design awards' },
        ],
      },
    },
    {
      id: 'contact', type: 'contact', variant: 'columns', tone: 'inverse',
      content: {
        eyebrow: 'New business',
        title: 'Have a project in mind?',
        lines: [
          { label: 'Email', value: 'hello@example.com' },
          { label: 'Studio', value: 'Rua da Rosa 22, Lisbon' },
          { label: 'Phone', value: '+351 21 000 0000' },
          { label: 'Hours', value: 'Mon–Fri, 9 am – 6 pm' },
        ],
      },
    },
  ],
}

const cafe = media('corner-cafe')
export const cornerCafe = {
  slug: 'corner-cafe',
  name: 'Corner Café',
  category: 'business',
  description: 'A warm bakery page with a full-bleed hero, a printed-style menu and opening hours.',
  tags: ['café', 'bakery', 'restaurant', 'menu'],
  featured: false,
  status: 'available',
  theme: {
    colors: { bg: '#f8f1e7', surface: '#fffaf2', ink: '#3b2417', muted: '#7f6352', accent: '#b4532a', accentInk: '#ffffff', inverseBg: '#3b2417', inverseInk: '#f8f1e7' },
    fonts: { display: 'fraunces', body: 'inter' },
    type: { displayWeight: 600, displayTracking: '-0.02em' },
    radius: 'round',
    imageFilter: 'warm',
  },
  sections: [
    { id: 'nav', type: 'nav', variant: 'split', content: { brand: 'Corner Café', links: ['Menu', 'Visit', 'Our story'], cta: 'Order ahead' } },
    {
      id: 'hero', type: 'hero', variant: 'cover', options: { align: 'start', overlay: 'gradient' },
      content: {
        eyebrow: 'Bakery & coffee since 1998',
        title: 'Fresh bread.\nSlow coffee.',
        subtitle: 'Your neighbourhood bakery on the corner of Rua Nova.',
        cta: 'See today’s menu',
        image: cafe('croissants', 'A pile of golden, flaky croissants'),
      },
    },
    {
      id: 'menu', type: 'list', variant: 'menu', tone: 'surface',
      content: {
        eyebrow: 'Menu',
        title: 'Baked this morning',
        items: [
          { title: 'Sourdough loaf', meta: '€5.50', text: 'Wild yeast, 36-hour rise' },
          { title: 'Pastel de nata', meta: '€1.40', text: 'Still warm, with cinnamon' },
          { title: 'Butter croissant', meta: '€2.20', text: 'French butter, 27 layers' },
          { title: 'Flat white', meta: '€2.80', text: 'Single-origin, roasted nearby' },
          { title: 'Cardamom bun', meta: '€3.10', text: 'Our Friday favourite' },
          { title: 'Fresh orange juice', meta: '€3.50', text: 'Squeezed to order' },
        ],
      },
    },
    {
      id: 'gallery', type: 'gallery', variant: 'masonry',
      content: {
        images: [
          cafe('bakery-shelves', 'Shelves of freshly baked bread and pastries'),
          cafe('latte', 'A latte in a teal cup on a wooden counter'),
          cafe('croissant-plate', 'A croissant on a plate with a knife'),
          cafe('latte-art', 'A cappuccino with leaf latte art'),
        ],
      },
    },
    {
      id: 'visit', type: 'contact', variant: 'columns', tone: 'inverse',
      content: {
        eyebrow: 'Visit us',
        title: 'Rua Nova 12, Porto',
        lines: [
          { label: 'Monday – Friday', value: '7 am – 6 pm' },
          { label: 'Saturday', value: '8 am – 4 pm' },
          { label: 'Sunday', value: 'Closed (we’re baking for Monday)' },
          { label: 'Phone', value: '+351 22 000 0000' },
        ],
      },
    },
  ],
}
