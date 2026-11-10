import Hero from './sections/Hero.jsx'
import {
  Contact,
  Countdown,
  Cta,
  Details,
  Gallery,
  List,
  Marquee,
  Nav,
  Progress,
  Quote,
  Stats,
  Text,
  Timeline,
} from './sections/Blocks.jsx'

/** Section `type` → component. Keys must match SECTION_TYPES in schema.js. */
export const SECTION_COMPONENTS = {
  nav: Nav,
  hero: Hero,
  details: Details,
  text: Text,
  gallery: Gallery,
  timeline: Timeline,
  list: List,
  stats: Stats,
  quote: Quote,
  countdown: Countdown,
  progress: Progress,
  cta: Cta,
  contact: Contact,
  marquee: Marquee,
}
