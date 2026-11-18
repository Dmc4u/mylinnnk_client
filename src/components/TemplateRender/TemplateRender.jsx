import { memo, useMemo, useRef } from 'react'
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion.js'
import { motionAttributes } from '../../templates/motion/resolveMotion.js'
import { useTemplateMotion } from '../../templates/motion/useTemplateMotion.js'
import '../../templates/motion/motion.css'
import { SECTION_COMPONENTS } from '../../templates/registry.js'
import { RenderModeContext, anchorId } from '../../templates/renderMode.js'
import { accentCustomised, themeToStyle } from '../../templates/theme.js'
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
 *
 * mode: 'design' (default: editor, gallery, previews) or 'published' (/p/:slug). Published pages draw
 * buttons only when they have a usable link, and give each section its id so #section links work.
 * branding: 'credit' adds the small "Created with MyLinnnk" footer. Only the public page passes it,
 * straight from the server's answer for the plan that was bought; designs never show it.
 */
function TemplateRender({ template, maxSections, selectedSectionId, mode = 'design', branding = 'none', motion = 'static' }) {
  const { theme } = template
  const sections = maxSections ? template.sections.slice(0, maxSections) : template.sections
  const published = mode === 'published'
  // motion: 'static' (default: editing canvas, thumbnails) or 'play' (published pages, template previews,
  // the editor's Preview mode). Each template's preset comes from the shared motion system
  // (templates/motion); when reduced motion is requested nothing moves.
  const rootRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()
  const play = motion === 'play' && !maxSections && !reducedMotion
  const m = useMemo(() => motionAttributes(template, { play }), [template, play])
  const sectionsKey = sections.map((s) => s.id).join('|')
  useTemplateMotion(rootRef, { enabled: play, key: `${m.preset}:${sectionsKey}` })

  return (
    <RenderModeContext.Provider value={published ? 'published' : 'design'}>
    <div
      className={`tpl tpl--${template.slug} tpl--radius-${theme.radius ?? 'soft'} tpl--filter-${theme.imageFilter ?? 'none'}${accentCustomised(template.slug, theme.colors) ? ' tpl--accent-custom' : ''}`}
      style={{ ...themeToStyle(theme), ...m.style }}
      data-template={template.slug}
      {...m.attrs}
      ref={rootRef}
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
            id={published ? anchorId(section.id) : undefined}
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
      {published && branding === 'credit' && !maxSections && (
        <footer className="tpl__credit">
          Created with{' '}
          <a href="/" target="_blank" rel="noopener">
            MyLinnnk
          </a>
        </footer>
      )}
    </div>
    </RenderModeContext.Provider>
  )
}

export default memo(TemplateRender)
