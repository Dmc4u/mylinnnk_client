/**
 * Template catalogue for the Template Gallery.
 *
 * Each template is a plain, JSON-serialisable object (see src/templates/schema.js):
 * catalogue metadata + `theme` (style) + `sections` (layout choices and the
 * user-editable `content`). Rendering lives entirely in <TemplateRender>.
 * Template definitions are grouped by category in ./templates/.
 */
import { validateTemplate } from '../templates/schema.js'
import { confettiPop, goldenThirty, paperAndPetals, twentyYears } from './templates/celebrations.js'
import { coastalEvening, gardenVows } from './templates/weddings.js'
import { cornerCafe, mentorCircle, northwindStudio, townHall } from './templates/work.js'
import { charityRun, frameAndField, studioMono, summerSessions } from './templates/creative.js'
import { graduationDay, helloBaby, lettersHome, yearInLisbon } from './templates/stories.js'
import {
  atelierBloom,
  caseStudy,
  cityHallVows,
  civicForward,
  fieldNotes,
  fieldhouse,
  firstTrip,
  galleryWall,
  goldenJubilee,
  inkAndLine,
  ivoryEditorial,
  ledgerAndCo,
  neonThirty,
  nightMarket,
  rivieraWeekend,
  rubyYears,
  scrapbookSixteen,
  stillUs,
} from './templates/premium.js'

export const CATEGORIES = [
  { id: 'birthdays', label: 'Birthdays' },
  { id: 'weddings', label: 'Weddings' },
  { id: 'anniversaries', label: 'Anniversaries' },
  { id: 'leadership-community', label: 'Leadership & Community' },
  { id: 'business', label: 'Business' },
  { id: 'portfolios', label: 'Portfolios' },
  { id: 'events', label: 'Events' },
  { id: 'personal-stories', label: 'Personal Stories' },
  { id: 'coming-soon', label: 'Coming Soon' },
]

export const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]))

export const TEMPLATES = [
  confettiPop,
  goldenThirty,
  gardenVows,
  coastalEvening,
  twentyYears,
  paperAndPetals,
  townHall,
  mentorCircle,
  northwindStudio,
  cornerCafe,
  frameAndField,
  studioMono,
  summerSessions,
  charityRun,
  yearInLisbon,
  lettersHome,
  graduationDay,
  helloBaby,
  // Premium expansion (November 2026)
  goldenJubilee,
  neonThirty,
  ivoryEditorial,
  rubyYears,
  civicForward,
  atelierBloom,
  galleryWall,
  nightMarket,
  fieldNotes,
  scrapbookSixteen,
  firstTrip,
  rivieraWeekend,
  cityHallVows,
  stillUs,
  ledgerAndCo,
  fieldhouse,
  caseStudy,
  inkAndLine,
]

if (import.meta.env.DEV) {
  const problems = TEMPLATES.flatMap(validateTemplate)
  if (problems.length) console.warn(`[templates] ${problems.length} schema problem(s):\n${problems.join('\n')}`)
}

export const FEATURED_TEMPLATES = TEMPLATES.filter((t) => t.featured)

export const getTemplateBySlug = (slug) => TEMPLATES.find((t) => t.slug === slug)
