import { useState } from 'react'
import { Link, useParams } from 'react-router'
import Button from '../../components/Button/Button.jsx'
import TemplateCard from '../../components/TemplateCard/TemplateCard.jsx'
import TemplateRender from '../../components/TemplateRender/TemplateRender.jsx'
import { CATEGORY_LABELS, TEMPLATES, getTemplateBySlug } from '../../data/templates.js'
import { getUseTemplateHref } from '../../utils/navigation.js'
import CREDITS from '../../data/template-credits.json'
import NotFoundPage from '../NotFoundPage/NotFoundPage.jsx'
import './TemplatePreviewPage.css'

const DEVICES = [
  { id: 'desktop', label: 'Desktop', width: 1200 },
  { id: 'tablet', label: 'Tablet', width: 820 },
  { id: 'phone', label: 'Phone', width: 390 },
]

export default function TemplatePreviewPage() {
  const { slug } = useParams()
  const template = getTemplateBySlug(slug)
  const [device, setDevice] = useState('desktop')

  if (!template) return <NotFoundPage message="We couldn’t find that template. It may have been renamed or removed." />

  const comingSoon = template.status === 'coming-soon'
  const frameWidth = DEVICES.find((d) => d.id === device).width
  const related = TEMPLATES.filter((t) => t.category === template.category && t.slug !== template.slug).slice(0, 3)
  const photoCredits = CREDITS.filter((c) => c.template === template.slug)

  return (
    <>
      <title>{`${template.name} template · MyLinnnk`}</title>

      <section className="preview">
        <div className="container">
          <Link to="/templates" className="preview__back">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All templates
          </Link>

          <div className="preview__bar">
            <div className="preview__heading">
              <p className="preview__category">
                <Link to={`/templates?category=${template.category}#browse`}>{CATEGORY_LABELS[template.category]}</Link>
              </p>
              <h1 className="preview__title">{template.name}</h1>
              <p className="preview__desc">{template.description}</p>
            </div>

            <div className="preview__tools">
              <div className="preview__devices" role="group" aria-label="Preview size">
                {DEVICES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="preview__device"
                    aria-pressed={device === d.id}
                    onClick={() => setDevice(d.id)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {comingSoon ? (
                <span className="preview__soon">Coming soon</span>
              ) : (
                <Button to={getUseTemplateHref(template.slug)}>Use This Template</Button>
              )}
            </div>
          </div>
        </div>

        <div className="preview__stage">
          <div className="preview__frame" style={{ '--frame-w': `${frameWidth}px` }}>
            <div className="preview__chrome" aria-hidden="true">
              <span className="preview__dots" />
              <span className="preview__url">mylinnnk.com/{template.slug}</span>
            </div>
            <div className="preview__page" role="region" aria-label={`Full preview of the ${template.name} template`}>
              <TemplateRender template={template} motion="play" />
            </div>
          </div>
          {photoCredits.length > 0 && (
            <p className="preview__credits">
              Sample photos (CC0):{' '}
              {photoCredits.map((c, i) => (
                <span key={c.file}>
                  {i > 0 && ', '}
                  <a href={c.page} target="_blank" rel="noreferrer">
                    {c.creator || 'Unknown photographer'}
                  </a>{' '}
                  ({c.origin ? `${c.origin}, via ${c.source}` : c.source})
                </span>
              ))}
              . Replace them with your own photos when you customise this template.
            </p>
          )}
        </div>

        {related.length > 0 && (
          <div className="container preview__related">
            <h2 className="preview__related-title">More {CATEGORY_LABELS[template.category]} templates</h2>
            <ul className="preview__related-grid">
              {related.map((t) => (
                <li key={t.slug}>
                  <TemplateCard template={t} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  )
}
