import { Link } from 'react-router'
import Button from '../Button/Button.jsx'
import TemplateThumb from '../TemplateThumb/TemplateThumb.jsx'
import useSpotlight from '../../hooks/useSpotlight.js'
import { CATEGORY_LABELS } from '../../data/templates.js'
import { getUseTemplateHref, templatePreviewPath } from '../../utils/navigation.js'
import './TemplateCard.css'

export default function TemplateCard({ template }) {
  const onPointerMove = useSpotlight()
  const comingSoon = template.status === 'coming-soon'
  const previewPath = templatePreviewPath(template.slug)

  return (
    <article className="lift-card template-card" onPointerMove={onPointerMove}>
      {/* Mouse shortcut to the preview; keyboard users get the Preview button */}
      <Link to={previewPath} className="template-card__media" tabIndex={-1} aria-hidden="true">
        <TemplateThumb template={template} />
        {comingSoon && <span className="template-card__badge">Coming soon</span>}
      </Link>

      <div className="template-card__body">
        <p className="template-card__category">{CATEGORY_LABELS[template.category]}</p>
        <h3 className="template-card__name">{template.name}</h3>
        <p className="template-card__desc">{template.description}</p>

        <div className="template-card__actions">
          <Button to={previewPath} variant="ghost" size="sm" aria-label={`Preview ${template.name}`}>
            Preview
          </Button>
          {comingSoon ? (
            <span className="template-card__soon">Available soon</span>
          ) : (
            <Button to={getUseTemplateHref(template.slug)} size="sm" aria-label={`Use This Template: ${template.name}`}>
              Use This Template
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
