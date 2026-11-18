import { useState } from 'react'
import { SECTION_TYPES, VARIANT_LABELS } from '../../templates/schema.js'
import { FONT_STACKS, IMAGE_FILTERS, RADII } from '../../templates/theme.js'
import { contrastRatio, deepenToContrast, readableOn, toHex6 } from '../model/contrast.js'
import { canDuplicate, canMove, canRemove, setTheme } from '../model/operations.js'
import { collectMediaIds } from '../model/page.js'
import { addableTypes } from '../model/sectionLibrary.js'
import { SelectField } from './fields.jsx'
import Icon from './icons.jsx'

/* ================= Page structure ================= */

const summary = (section) => {
  const c = section.content ?? {}
  const text = c.title ?? c.brand ?? c.text ?? c.eyebrow ?? (Array.isArray(c.items) ? c.items.map((i) => (typeof i === 'string' ? i : i.title ?? i.label)).join(', ') : '')
  return String(text ?? '').split('\n')[0].slice(0, 48)
}

export function StructurePanel({ page, selectedId, onSelect, onStructure, onAdd }) {
  const [dragId, setDragId] = useState(null)
  return (
    <div className="ed-panel">
      <div className="ed-panel__bar">
        <h2 className="ed-panel__title">Page structure</h2>
        <button type="button" className="ed-btn ed-btn--sm" onClick={onAdd}>
          <Icon name="plus" size={16} /> Add section
        </button>
      </div>
      <p className="ed-panel__hint">One page · {page.sections.length} sections. Drag to reorder, or use the arrows.</p>
      <ol className="ed-structure">
        {page.sections.map((section, index) => {
          const def = SECTION_TYPES[section.type]
          const selected = section.id === selectedId
          return (
            <li
              key={section.id}
              className={`ed-structure__item${selected ? ' is-selected' : ''}${dragId === section.id ? ' is-dragging' : ''}`}
              draggable
              onDragStart={(e) => {
                setDragId(section.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', section.id)
              }}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain')
                if (id) onStructure('moveTo', id, index)
                setDragId(null)
              }}
            >
              <span className="ed-structure__grip" aria-hidden="true">
                <Icon name="grip" size={16} />
              </span>
              <button type="button" className="ed-structure__select" aria-current={selected ? 'true' : undefined} onClick={() => onSelect(section.id)}>
                <span className="ed-structure__label">{def.label}</span>
                <span className="ed-structure__meta">{VARIANT_LABELS[section.variant] ?? section.variant}{summary(section) ? ` · ${summary(section)}` : ''}</span>
              </button>
              <span className="ed-structure__tools">
                <button type="button" className="ed-iconbtn ed-iconbtn--sm" disabled={!canMove(page, section, -1)} onClick={() => onStructure('move', section.id, -1)} aria-label={`Move ${def.label} up`}>
                  <Icon name="up" size={16} />
                </button>
                <button type="button" className="ed-iconbtn ed-iconbtn--sm" disabled={!canMove(page, section, 1)} onClick={() => onStructure('move', section.id, 1)} aria-label={`Move ${def.label} down`}>
                  <Icon name="down" size={16} />
                </button>
                <button type="button" className="ed-iconbtn ed-iconbtn--sm" disabled={!canDuplicate(page, section)} onClick={() => onStructure('duplicate', section.id)} aria-label={`Duplicate ${def.label}`}>
                  <Icon name="copy" size={16} />
                </button>
                <button type="button" className="ed-iconbtn ed-iconbtn--sm ed-iconbtn--danger" disabled={!canRemove(page, section)} onClick={() => onStructure('remove', section.id)} aria-label={`Remove ${def.label}`}>
                  <Icon name="trash" size={16} />
                </button>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ================= Add section ================= */

const DESCRIPTIONS = {
  nav: 'Your page name and a simple menu at the top.',
  details: 'Key facts such as date, place and dress code.',
  text: 'A heading and a few paragraphs, optionally with a photo.',
  gallery: 'A grid of photos in several styles.',
  timeline: 'Milestones or a schedule, in order.',
  list: 'Highlights, services, a menu or a line-up.',
  stats: 'A few big numbers that tell your story.',
  quote: 'A favourite quote or a kind word.',
  countdown: 'Days, hours and minutes to the big moment.',
  progress: 'A fundraising goal with a progress bar.',
  cta: 'A short invitation with a button.',
  contact: 'Email, phone, address or opening hours.',
  marquee: 'A band of scrolling words.',
}

export function AddSectionPanel({ page, onAddSection }) {
  const types = addableTypes(page)
  return (
    <div className="ed-panel">
      <h2 className="ed-panel__title">Add a section</h2>
      <p className="ed-panel__hint">New sections are added below the selected one. You can change their style afterwards.</p>
      <ul className="ed-addlist">
        {types.map((type) => (
          <li key={type}>
            <button type="button" className="ed-addlist__btn" onClick={() => onAddSection(type)}>
              <strong>{SECTION_TYPES[type].label}</strong>
              <span>{DESCRIPTIONS[type]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ================= Theme ================= */

const COLOR_FIELDS = [
  ['bg', 'Page background'],
  ['ink', 'Text'],
  ['muted', 'Secondary text'],
  ['accent', 'Primary colour'],
  ['accentInk', 'Text on primary'],
  ['surface', 'Card background'],
  ['surfaceInk', 'Text on cards'],
  ['inverseBg', 'Dark section background'],
  ['inverseInk', 'Text on dark sections'],
]

const CONTRAST_PAIRS = [
  ['ink', 'bg', 'Text on page'],
  ['muted', 'bg', 'Secondary text on page'],
  // The primary colour is also used for small headings and labels on the page.
  ['accent', 'bg', 'Primary colour as text'],
  ['accentInk', 'accent', 'Button text'],
  ['surfaceInk', 'surface', 'Text on cards'],
  ['inverseInk', 'inverseBg', 'Text on dark sections'],
]

const FONT_LABELS = {
  inter: 'Inter', cormorant: 'Cormorant Garamond', 'great-vibes': 'Great Vibes (script)', fraunces: 'Fraunces',
  'dm-serif': 'DM Serif Display', playfair: 'Playfair Display', 'space-grotesk': 'Space Grotesk',
  bricolage: 'Bricolage Grotesque', bebas: 'Bebas Neue', caveat: 'Caveat (handwritten)', jetbrains: 'JetBrains Mono',
  fredoka: 'Fredoka', syne: 'Syne',
}
const fontOptions = Object.keys(FONT_STACKS).map((k) => ({ value: k, label: FONT_LABELS[k] ?? k }))

export function ThemePanel({ page, template, apply }) {
  const { colors, fonts, type = {} } = page.theme
  const colorOf = (key) => colors[key] ?? (key === 'surfaceInk' ? colors.ink : key === 'inverseBg' ? colors.ink : key === 'inverseInk' ? colors.bg : '#000000')
  const set = (path, value, key) => apply((p) => setTheme(p, path, value), key ?? `theme:${path.join('.')}`)

  return (
    <div className="ed-panel ed-theme">
      <h2 className="ed-panel__title">Theme</h2>

      <fieldset className="ed-fieldset">
        <legend>Colours</legend>
        <div className="ed-colors">
          {COLOR_FIELDS.map(([key, label]) => (
            <label key={key} className="ed-color">
              <input type="color" value={toHex6(colorOf(key))} onChange={(e) => set(['colors', key], e.target.value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="ed-fieldset">
        <legend>Readability</legend>
        <ul className="ed-contrast">
          {CONTRAST_PAIRS.map(([fg, bg, label]) => {
            const ratio = contrastRatio(colorOf(fg), colorOf(bg))
            const ok = ratio >= 4.5
            return (
              <li key={fg} className={ok ? 'is-ok' : 'is-low'}>
                <span className="ed-contrast__swatch" style={{ background: colorOf(bg), color: colorOf(fg) }} aria-hidden="true">Aa</span>
                <span>
                  {label}
                  {/* The page itself is drawn with a readable shade meanwhile (templates/theme.js). */}
                  <small>{ratio.toFixed(1)}:1 {ok ? 'Readable' : 'Low contrast · the page uses a readable shade until fixed'}</small>
                </span>
                {!ok && (
                  <button type="button" className="ed-btn ed-btn--ghost ed-btn--sm" onClick={() => set(['colors', fg], fg === 'accent' ? deepenToContrast(colorOf(fg), colorOf(bg)) : readableOn(colorOf(bg)), `fix:${fg}`)}>
                    Fix
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </fieldset>

      <fieldset className="ed-fieldset">
        <legend>Typography</legend>
        <SelectField label="Heading font" value={fonts.display} options={fontOptions} onChange={(v) => set(['fonts', 'display'], v)} />
        <SelectField label="Body font" value={fonts.body} options={fontOptions} onChange={(v) => set(['fonts', 'body'], v)} />
        <SelectField label="Accent / script font" value={fonts.script ?? fonts.display} options={fontOptions} onChange={(v) => set(['fonts', 'script'], v)} />
        <SelectField
          label="Heading weight"
          value={String(type.displayWeight ?? 600)}
          options={[200, 300, 400, 500, 600, 700, 800].map((w) => ({ value: String(w), label: String(w) }))}
          onChange={(v) => set(['type', 'displayWeight'], Number(v))}
        />
        <SelectField
          label="Heading capitals"
          value={type.displayCase ?? 'none'}
          options={[{ value: 'none', label: 'As written' }, { value: 'uppercase', label: 'ALL CAPS' }]}
          onChange={(v) => set(['type', 'displayCase'], v)}
        />
        <SelectField
          label="Heading size"
          value={String(type.displayScale ?? 1)}
          options={[0.8, 0.86, 0.9, 1, 1.1, 1.2].map((s) => ({ value: String(s), label: `${Math.round(s * 100)}%` }))}
          onChange={(v) => set(['type', 'displayScale'], Number(v))}
        />
        <SelectField
          label="Body text size"
          value={type.bodySize ?? '18px'}
          options={['16px', '17px', '18px', '19px', '20px', '21px'].map((s) => ({ value: s, label: s }))}
          onChange={(v) => set(['type', 'bodySize'], v)}
        />
      </fieldset>

      <fieldset className="ed-fieldset">
        <legend>Style</legend>
        <SelectField label="Corners" value={page.theme.radius ?? 'soft'} options={Object.keys(RADII).map((r) => ({ value: r, label: r[0].toUpperCase() + r.slice(1) }))} onChange={(v) => set(['radius'], v)} />
        <SelectField
          label="Ornament"
          value={page.theme.ornament ?? 'none'}
          options={['none', 'botanical', 'confetti', 'stars', 'waves'].map((o) => ({ value: o, label: o[0].toUpperCase() + o.slice(1) }))}
          onChange={(v) => set(['ornament'], v === 'none' ? undefined : v)}
          hint="Shown by layouts that support it (for example arched, collage and framed heroes)."
        />
        <SelectField label="Photo effect" value={page.theme.imageFilter ?? 'none'} options={IMAGE_FILTERS.map((f) => ({ value: f, label: f[0].toUpperCase() + f.slice(1) }))} onChange={(v) => set(['imageFilter'], v)} />
      </fieldset>

      <button type="button" className="ed-btn ed-btn--ghost" onClick={() => apply((p) => ({ ...p, theme: structuredClone(template.theme) }))}>
        <Icon name="restore" size={16} /> Reset theme to “{template.name}”
      </button>
    </div>
  )
}

/* ================= Media ================= */

export function MediaPanel({ page, media, onRequestDelete }) {
  const used = collectMediaIds(page)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const templatePhotos = new Set()
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') {
      if (typeof v.src === 'string' && v.src.startsWith('/template-media/')) templatePhotos.add(v.src)
      Object.values(v).forEach(walk)
    }
  }
  page.sections.forEach((s) => walk(s.content))

  return (
    <div className="ed-panel">
      <h2 className="ed-panel__title">Media library</h2>
      <p className="ed-panel__hint">
        Your uploads are kept in this browser with this draft. They are not uploaded to MyLinnnk until accounts launch.
      </p>
      <label className={`ed-btn ed-btn--sm ed-upload${busy ? ' is-busy' : ''}`}>
        <Icon name="upload" size={16} /> {busy ? 'Adding…' : 'Upload images'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={async (e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ''
            setBusy(true)
            setError(null)
            for (const file of files) {
              try {
                await media.upload(file)
              } catch (err) {
                setError(`${file.name}: ${err.message}`)
              }
            }
            setBusy(false)
          }}
        />
      </label>
      {error && <p className="ed-field__hint is-error" role="alert">{error}</p>}

      <h3 className="ed-panel__subtitle">Your uploads</h3>
      {media.records.length === 0 ? (
        <p className="ed-panel__hint">No uploads yet. Add images here, or use Upload on any image field.</p>
      ) : (
        <ul className="ed-media">
          {media.records.map((m) => (
            <li key={m.id}>
              <img src={media.urls.get(m.id)} alt="" />
              <span className="ed-media__name">{m.name}</span>
              <span className="ed-media__meta">{m.width}×{m.height} · {used.has(m.id) ? 'In use' : 'Not used'}</span>
              <button type="button" className="ed-iconbtn ed-iconbtn--sm ed-iconbtn--danger" disabled={used.has(m.id)} onClick={() => onRequestDelete(m)} aria-label={`Delete ${m.name}`} title={used.has(m.id) ? 'Remove it from the page first' : undefined}>
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="ed-panel__subtitle">Template photos on this page</h3>
      <ul className="ed-media ed-media--template">
        {[...templatePhotos].map((src) => (
          <li key={src}>
            <img src={src} alt="" />
            <span className="ed-media__name">{src.split('/').pop()}</span>
            <span className="ed-media__meta">Sample photo (CC0)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ================= Local drafts ================= */

export function DraftsPanel({ drafts, currentId, stored, templatesBySlug, onOpen, onNew, onRequestDelete, storageOk, cloudDrafts = null, currentCloudId = null, onOpenCloud }) {
  const signedIn = cloudDrafts !== null
  return (
    <div className="ed-panel">
      <h2 className="ed-panel__title">{signedIn ? 'Your drafts' : 'Drafts on this device'}</h2>
      {signedIn ? (
        <>
          <h3 className="ed-drafts__group">In your account</h3>
          {cloudDrafts.length === 0 ? (
            <p className="ed-field__hint">No drafts in your account yet. New pages you edit while logged in are saved there.</p>
          ) : (
            <ul className="ed-drafts">
              {cloudDrafts.map((d) => (
                <li key={d.id} className={d.id === currentCloudId ? 'is-current' : ''}>
                  <button type="button" className="ed-drafts__open" onClick={() => onOpenCloud(d)} disabled={d.id === currentCloudId} aria-current={d.id === currentCloudId ? 'true' : undefined}>
                    <span className="ed-drafts__title">{d.title || 'Untitled page'}</span>
                    <span className="ed-drafts__meta">
                      {templatesBySlug[d.templateSlug]?.name ?? d.templateSlug} · edited {new Date(d.updatedAt).toLocaleString()}
                      {d.id === currentCloudId ? ' · open' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <h3 className="ed-drafts__group">On this device</h3>
        </>
      ) : (
        <div className="ed-notice">
          <Icon name="info" />
          <p>
            Guest drafts are stored only in this browser. Clearing browser data, switching devices or using private
            browsing can remove them. Log in to save drafts to an account.
          </p>
        </div>
      )}
      {!storageOk && <p className="ed-field__hint is-error">This browser is blocking local storage, so drafts can’t be kept after you close the tab.</p>}
      <button type="button" className="ed-btn ed-btn--sm" onClick={onNew}>
        <Icon name="plus" size={16} /> Start a fresh draft
      </button>
      <ul className="ed-drafts">
        {!stored && (
          <li className="is-current">
            <span className="ed-drafts__title">This draft</span>
            <span className="ed-drafts__meta">Not saved yet: it’s stored after your first change</span>
          </li>
        )}
        {drafts.map((d) => (
          <li key={d.id} className={d.id === currentId ? 'is-current' : ''}>
            <button type="button" className="ed-drafts__open" onClick={() => onOpen(d)} disabled={d.id === currentId} aria-current={d.id === currentId ? 'true' : undefined}>
              <span className="ed-drafts__title">{d.title || 'Untitled page'}</span>
              <span className="ed-drafts__meta">
                {templatesBySlug[d.templateSlug]?.name ?? d.templateSlug} · edited {new Date(d.updatedAt).toLocaleString()}
                {d.id === currentId ? ' · open' : ''}
              </span>
            </button>
            <button type="button" className="ed-iconbtn ed-iconbtn--sm ed-iconbtn--danger" onClick={() => onRequestDelete(d)} aria-label={`Delete draft ${d.title || 'Untitled page'}`}>
              <Icon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
