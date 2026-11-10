import {
  OPTION_LABELS,
  SECTION_TONES,
  SECTION_TYPES,
  VARIANT_LABELS,
  fieldLabel,
  fieldsForVariant,
  optionsForVariant,
} from '../../templates/schema.js'
import { canDuplicate, canMove, canRemove, setContent, setOption, setTitle, setTone, setVariant } from '../model/operations.js'
import { ImageField, LinkField, ListField, NumberField, SelectField, StringsField, TextField } from './fields.jsx'
import Icon from './icons.jsx'

const TONE_LABELS = { default: 'Page background', surface: 'Card colour', accent: 'Primary colour', inverse: 'Dark' }
const OPTION_VALUE_LABELS = { start: 'Left', end: 'Right', center: 'Centre', rect: 'Rectangle' }
const pretty = (v) => OPTION_VALUE_LABELS[v] ?? v[0].toUpperCase() + v.slice(1)

/** Blank item for "Add item" in a list of objects. */
const blankItem = (of) => (of === 'image' ? { alt: '' } : Object.fromEntries(Object.entries(of).filter(([, k]) => k !== 'image').map(([k]) => [k, ''])))

/**
 * Editing controls for the selected section, generated from SECTION_TYPES in
 * the template schema — no per-template forms.
 */
export default function PropertiesPanel({ page, section, apply, media, onStructure }) {
  if (!section) {
    return (
      <div className="ed-props">
        <h2 className="ed-panel__title">Page settings</h2>
        <TextField label="Page title" value={page.title} onChange={(v) => apply((p) => setTitle(p, v), 'title')} hint="Shown in your draft list and, later, in the browser tab of your published page." />
        <p className="ed-props__empty">
          <Icon name="info" />
          <span>
            Select a section on the page, or in <b>Page structure</b>, to edit its content and layout.
          </span>
        </p>
      </div>
    )
  }

  const def = SECTION_TYPES[section.type]
  const fieldKeys = fieldsForVariant(section.type, section.variant).filter((k) => k in def.fields)
  const options = optionsForVariant(section.type, section.variant)
  const setField = (path, value) => apply((p) => setContent(p, section.id, path, value), `${section.id}:${path.join('.')}`)

  const imageProps = { mediaUrls: media.urls, library: media.records, onUpload: media.upload }

  function renderField(key, kind, value, path) {
    const label = fieldLabel(key)
    if (kind === 'richtext') return <TextField key={key} label={label} value={value} multiline onChange={(v) => setField(path, v)} hint="Leave an empty line between paragraphs." />
    if (kind === 'link') return <LinkField key={`${section.id}-${path.join('.')}`} label={label} value={value} onChange={(v) => setField(path, v)} />
    if (kind === 'number') return <NumberField key={key} label={label} value={value} min={0} max={100} onChange={(v) => setField(path, v)} />
    if (kind === 'strings') return <StringsField key={key} label={label} value={value} onChange={(v) => setField(path, v)} />
    if (kind === 'image') {
      return (
        <ImageField
          key={key}
          label={label}
          image={value}
          onChange={(v) => setField(path, v)}
          removable={section.type !== 'hero'}
          showCaption={section.variant === 'framed'}
          {...imageProps}
        />
      )
    }
    if (typeof kind === 'object' && kind.kind === 'list') {
      const isImages = kind.of === 'image'
      return (
        <ListField
          key={key}
          label={label}
          items={value}
          of={kind.of}
          noun={isImages ? 'image' : 'item'}
          max={section.type === 'hero' ? 3 : 12}
          newItem={() => blankItem(kind.of)}
          onChange={(v) => setField(path, v)}
          renderItem={(item, i) =>
            isImages ? (
              <ImageField label={`Image ${i + 1}`} image={item} onChange={(v) => setField([...path, i], v)} showCaption={section.type === 'gallery'} {...imageProps} />
            ) : (
              Object.entries(kind.of).map(([subKey, subKind]) => renderField(subKey, subKind, item?.[subKey], [...path, i, subKey]))
            )
          }
        />
      )
    }
    // Headings may contain line breaks, so they get a small multi-line box.
    const multiline = key === 'title' || (typeof value === 'string' && value.includes('\n'))
    return (
      <TextField
        key={key}
        label={label}
        value={value}
        multiline={multiline}
        rows={multiline ? 3 : undefined}
        hint={multiline ? 'Press Enter to start a new line.' : undefined}
        onChange={(v) => setField(path, v)}
      />
    )
  }

  return (
    <div className="ed-props">
      <div className="ed-props__head">
        <div>
          <p className="ed-props__kicker">Selected section</p>
          <h2 className="ed-panel__title">{def.label}</h2>
        </div>
        <div className="ed-props__tools">
          <button type="button" className="ed-iconbtn" disabled={!canMove(page, section, -1)} onClick={() => onStructure('move', section.id, -1)} aria-label={`Move ${def.label} up`}>
            <Icon name="up" />
          </button>
          <button type="button" className="ed-iconbtn" disabled={!canMove(page, section, 1)} onClick={() => onStructure('move', section.id, 1)} aria-label={`Move ${def.label} down`}>
            <Icon name="down" />
          </button>
          <button type="button" className="ed-iconbtn" disabled={!canDuplicate(page, section)} onClick={() => onStructure('duplicate', section.id)} aria-label={`Duplicate ${def.label}`}>
            <Icon name="copy" />
          </button>
          <button type="button" className="ed-iconbtn ed-iconbtn--danger" disabled={!canRemove(page, section)} onClick={() => onStructure('remove', section.id)} aria-label={`Remove ${def.label}`}>
            <Icon name="trash" />
          </button>
        </div>
      </div>

      <section className="ed-props__group" aria-label="Layout">
        <h3>Layout</h3>
        {def.variants.length > 1 && (
          <SelectField
            label="Style"
            value={section.variant}
            options={def.variants.map((v) => ({ value: v, label: VARIANT_LABELS[v] ?? pretty(v) }))}
            onChange={(v) => apply((p) => setVariant(p, section.id, v))}
          />
        )}
        {section.type !== 'hero' && section.type !== 'nav' && (
          <SelectField
            label={OPTION_LABELS.tone}
            value={section.tone ?? 'default'}
            options={SECTION_TONES.map((t) => ({ value: t, label: TONE_LABELS[t] }))}
            onChange={(v) => apply((p) => setTone(p, section.id, v))}
          />
        )}
        {Object.entries(options).map(([key, values]) => (
          <SelectField
            key={key}
            label={OPTION_LABELS[key] ?? pretty(key)}
            value={section.options?.[key] ?? (key === 'spacing' ? 'normal' : values[0])}
            options={values.map((v) => ({ value: v, label: pretty(v) }))}
            onChange={(v) => apply((p) => setOption(p, section.id, key, key === 'spacing' && v === 'normal' ? undefined : v))}
          />
        ))}
      </section>

      <section className="ed-props__group" aria-label="Content">
        <h3>Content</h3>
        {fieldKeys.map((key) => renderField(key, def.fields[key], section.content?.[key], [key]))}
      </section>
    </div>
  )
}
