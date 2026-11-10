import { memo } from 'react'
import { SECTION_COMPONENTS } from '../../templates/registry.js'
import { themeToStyle } from '../../templates/theme.js'
import '../../templates/fonts.css'
import './TemplateRender.css'

/**
 * Renders a template's data (theme + sections) as a real HTML/CSS page.
 * Presentation lives in the section components and CSS; everything a user
 * would edit comes from `template.sections[].content`.
 *
 * maxSections limits how many sections are rendered (thumbnails only need
 * the top of the page). selectedSectionId (editor only) marks one section as
 * selected so the editor can outline it.
 */
function TemplateRender({ template, maxSections, selectedSectionId }) {
  const { theme } = template
  const sections = maxSections ? template.sections.slice(0, maxSections) : template.sections

  return (
    <div
      className={`tpl tpl--${template.slug} tpl--radius-${theme.radius ?? 'soft'} tpl--filter-${theme.imageFilter ?? 'none'}`}
      style={themeToStyle(theme)}
      data-template={template.slug}
    >
      {sections.map((section) => {
        const Section = SECTION_COMPONENTS[section.type]
        if (!Section) return null
        const Tag = section.type === 'nav' ? 'div' : section.type === 'hero' ? 'header' : 'section'
        return (
          <Tag
            key={section.id}
            className={`ts ts-${section.type} ts-${section.type}--${section.variant} ts-tone-${section.tone ?? 'default'} ts-space-${section.options?.spacing ?? 'normal'}${section.id === selectedSectionId ? ' is-selected' : ''}`}
            data-section={section.id}
          >
            <Section
              variant={section.variant}
              content={section.content ?? {}}
              options={section.options}
              ornament={theme.ornament}
            />
          </Tag>
        )
      })}
      {!maxSections && (
        <footer className="tpl__credit">
          Made with <b>MyLinnnk</b>
        </footer>
      )}
    </div>
  )
}

export default memo(TemplateRender)
