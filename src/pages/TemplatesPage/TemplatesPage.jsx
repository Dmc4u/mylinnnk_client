import { useId, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import FeaturedShowcase from '../../components/FeaturedShowcase/FeaturedShowcase.jsx'
import TemplateCard from '../../components/TemplateCard/TemplateCard.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import { CATEGORIES, CATEGORY_LABELS, FEATURED_TEMPLATES, TEMPLATES } from '../../data/templates.js'
import './TemplatesPage.css'

const normalise = (value) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function matchesQuery(template, query) {
  if (!query) return true
  const haystack = normalise(
    [template.name, template.description, CATEGORY_LABELS[template.category], ...template.tags].join(' '),
  )
  return normalise(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}

export default function TemplatesPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const requested = params.get('category')
  const category = CATEGORIES.some((c) => c.id === requested) ? requested : 'all'
  const searchId = useId()

  const updateParams = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) => {
      if (!value || value === 'all') next.delete(key)
      else next.set(key, value)
    })
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const searchMatches = useMemo(() => TEMPLATES.filter((t) => matchesQuery(t, query)), [query])
  const results = category === 'all' ? searchMatches : searchMatches.filter((t) => t.category === category)
  const hasFilters = query || category !== 'all'

  return (
    <>
      <title>Templates · MyLinnnk</title>

      <section className="templates-hero">
        <div className="container">
          <p className="templates-hero__eyebrow">Template gallery</p>
          <h1 className="templates-hero__title">
            Find the perfect page for <span className="text-gradient">your moment</span>
          </h1>
          <p className="templates-hero__intro">
            Browse original designs for celebrations, milestones, businesses and stories. Preview any template in full,
            then make it yours.
          </p>
        </div>
      </section>

      <FeaturedShowcase templates={FEATURED_TEMPLATES} />

      <section id="browse" className="gallery" aria-labelledby="browse-title">
        <div className="container">
          <Reveal className="gallery__head">
            <h2 id="browse-title" className="gallery__title">
              Browse all templates
            </h2>

            <div className="gallery__search">
              <label htmlFor={searchId} className="sr-only">
                Search templates
              </label>
              <svg className="gallery__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                id={searchId}
                type="search"
                value={query}
                placeholder="Search by name, style or occasion"
                autoComplete="off"
                onChange={(e) => updateParams({ q: e.target.value })}
              />
            </div>
          </Reveal>

          <div className="gallery__filters" role="group" aria-label="Filter by category">
            <button
              type="button"
              className="gallery__chip"
              aria-pressed={category === 'all'}
              onClick={() => updateParams({ category: 'all' })}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className="gallery__chip"
                aria-pressed={category === c.id}
                onClick={() => updateParams({ category: c.id })}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Announced to screen readers when the filter changes; no counts are shown to visitors. */}
          <p className="sr-only" role="status">
            {results.length === 0
              ? 'No templates found'
              : `Showing ${category === 'all' ? 'all templates' : `${CATEGORY_LABELS[category]} templates`}${query ? ` matching “${query}”` : ''}`}
          </p>

          {results.length > 0 ? (
            <ul className="gallery__grid">
              {results.map((template) => (
                <li key={template.slug} className="gallery__item">
                  <TemplateCard template={template} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="gallery__empty">
              <p className="gallery__empty-title">No templates found</p>
              <p>Try a different search, or browse every category.</p>
              {hasFilters && (
                <button type="button" className="gallery__reset" onClick={() => updateParams({ q: '', category: 'all' })}>
                  Clear search and filters
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
