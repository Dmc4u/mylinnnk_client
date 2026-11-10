import { useId, useRef, useState } from 'react'
import { isSafeLink } from '../model/page.js'
import { ACCEPTED_TYPES } from '../services/mediaService.js'
import Icon from './icons.jsx'

export function TextField({ label, value, onChange, multiline = false, rows = 6, hint, placeholder }) {
  const id = useId()
  const Input = multiline ? 'textarea' : 'input'
  return (
    <div className="ed-field">
      <label htmlFor={id}>{label}</label>
      <Input
        id={id}
        value={value ?? ''}
        placeholder={placeholder}
        rows={multiline ? rows : undefined}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && <p id={`${id}-hint`} className="ed-field__hint">{hint}</p>}
    </div>
  )
}

export function LinkField({ label, value, onChange }) {
  const id = useId()
  // Local text only while the input is invalid; otherwise show the page value (so undo updates it).
  const [invalidText, setInvalidText] = useState(null)
  const draft = invalidText ?? value ?? ''
  const valid = invalidText === null
  return (
    <div className="ed-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode="url"
        value={draft}
        placeholder="https://example.com, mailto: or #section"
        aria-invalid={!valid}
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          const next = e.target.value.trim()
          if (isSafeLink(next)) {
            setInvalidText(null)
            onChange(next || undefined)
          } else setInvalidText(e.target.value)
        }}
      />
      <p id={`${id}-hint`} className={`ed-field__hint${valid ? '' : ' is-error'}`}>
        {valid ? 'Where the button will go on your published page.' : 'Use a link starting with https://, mailto:, tel: or #.'}
      </p>
    </div>
  )
}

export function NumberField({ label, value, onChange, min, max }) {
  const id = useId()
  return (
    <div className="ed-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        value={value ?? 0}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n)))
        }}
      />
    </div>
  )
}

export function SelectField({ label, value, options, onChange, hint }) {
  const id = useId()
  return (
    <div className="ed-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="ed-field__hint">{hint}</p>}
    </div>
  )
}

/** Reorder / remove buttons shared by list editors. */
function ItemTools({ index, count, onMove, onRemove, noun }) {
  return (
    <span className="ed-itemtools">
      <button type="button" className="ed-iconbtn ed-iconbtn--sm" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={`Move ${noun} ${index + 1} up`}>
        <Icon name="up" size={16} />
      </button>
      <button type="button" className="ed-iconbtn ed-iconbtn--sm" disabled={index === count - 1} onClick={() => onMove(index, 1)} aria-label={`Move ${noun} ${index + 1} down`}>
        <Icon name="down" size={16} />
      </button>
      <button type="button" className="ed-iconbtn ed-iconbtn--sm" onClick={() => onRemove(index)} aria-label={`Remove ${noun} ${index + 1}`}>
        <Icon name="trash" size={16} />
      </button>
    </span>
  )
}

const moveItem = (list, index, delta) => {
  const next = [...list]
  const [item] = next.splice(index, 1)
  next.splice(index + delta, 0, item)
  return next
}

export function StringsField({ label, value = [], onChange }) {
  return (
    <fieldset className="ed-fieldset">
      <legend>{label}</legend>
      {value.map((item, i) => (
        <div key={i} className="ed-row">
          <input
            aria-label={`${label} ${i + 1}`}
            value={item}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
          />
          <ItemTools index={i} count={value.length} noun="item" onMove={(idx, d) => onChange(moveItem(value, idx, d))} onRemove={(idx) => onChange(value.filter((_, j) => j !== idx))} />
        </div>
      ))}
      <button type="button" className="ed-btn ed-btn--ghost ed-btn--sm" onClick={() => onChange([...value, 'New item'])}>
        <Icon name="plus" size={16} /> Add
      </button>
    </fieldset>
  )
}

/* ---------------- Images ---------------- */

export function ImageField({ label, image, onChange, mediaUrls, library, onUpload, removable, showCaption }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const altId = useId()
  const captionId = useId()
  const current = image ?? { alt: '' }
  const previewSrc = current.mediaId ? mediaUrls.get(current.mediaId) : current.src
  const hasImage = Boolean(current.src || current.mediaId)

  const replaceWith = (patch) => {
    // Remember the template's own photo the first time it is replaced, so it can be restored.
    const original = current.original ?? (current.src ? { src: current.src, alt: current.alt, focus: current.focus } : undefined)
    const next = { alt: current.alt, caption: current.caption, focus: current.focus, ...patch, original }
    if (!next.original) delete next.original
    if (!next.caption) delete next.caption
    if (!next.focus) delete next.focus
    if (next.mediaId) delete next.src
    onChange(next)
  }

  const onFile = async (file) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const { mediaId, persisted } = await onUpload(file)
      replaceWith({ mediaId, alt: current.alt || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') })
      if (!persisted) setError('Saved for this tab only: this browser is blocking image storage.')
    } catch (e) {
      setError(e.message || 'That image could not be added.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <fieldset className="ed-fieldset ed-image">
      <legend>{label}</legend>
      <div className="ed-image__preview">
        {previewSrc ? <img src={previewSrc} alt="" /> : <span className="ed-image__empty"><Icon name="image" size={22} /> No image</span>}
      </div>
      <div className="ed-image__actions">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <button type="button" className="ed-btn ed-btn--ghost ed-btn--sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={16} /> {busy ? 'Adding…' : hasImage ? 'Replace' : 'Upload'}
        </button>
        {library.length > 0 && (
          <button type="button" className="ed-btn ed-btn--ghost ed-btn--sm" aria-expanded={libraryOpen} onClick={() => setLibraryOpen((o) => !o)}>
            <Icon name="folder" size={16} /> Library
          </button>
        )}
        {current.original && (
          <button type="button" className="ed-btn ed-btn--ghost ed-btn--sm" onClick={() => onChange({ ...current.original, caption: current.caption })}>
            <Icon name="restore" size={16} /> Restore original
          </button>
        )}
        {removable && hasImage && (
          <button type="button" className="ed-btn ed-btn--ghost ed-btn--sm" onClick={() => onChange({ alt: '', original: current.original ?? (current.src ? { src: current.src, alt: current.alt } : undefined) })}>
            <Icon name="trash" size={16} /> Remove
          </button>
        )}
      </div>
      {libraryOpen && (
        <ul className="ed-image__library" aria-label="Your uploaded images">
          {library.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => { replaceWith({ mediaId: m.id }); setLibraryOpen(false) }} aria-label={`Use ${m.name}`}>
                <img src={mediaUrls.get(m.id)} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="ed-field__hint is-error" role="alert">{error}</p>}
      <div className="ed-field">
        <label htmlFor={altId}>Alt text</label>
        <input id={altId} value={current.alt ?? ''} placeholder="Describe the image for screen readers" onChange={(e) => onChange({ ...current, alt: e.target.value })} />
      </div>
      {showCaption && (
        <div className="ed-field">
          <label htmlFor={captionId}>Caption</label>
          <input id={captionId} value={current.caption ?? ''} onChange={(e) => onChange({ ...current, caption: e.target.value || undefined })} />
        </div>
      )}
      {hasImage && (
        <SelectField
          label="Focus point"
          value={current.focus ?? 'center'}
          options={['center', 'top', 'bottom', 'left', 'right'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))}
          onChange={(focus) => onChange({ ...current, focus: focus === 'center' ? undefined : focus })}
        />
      )}
    </fieldset>
  )
}

/* ---------------- Lists of objects / images ---------------- */

export function ListField({ label, items = [], of, onChange, renderItem, newItem, noun = 'item', max = 24 }) {
  return (
    <fieldset className="ed-fieldset ed-list">
      <legend>{label}</legend>
      {items.map((item, i) => (
        <div key={i} className="ed-list__item">
          <div className="ed-list__head">
            <span>{noun[0].toUpperCase() + noun.slice(1)} {i + 1}</span>
            <ItemTools index={i} count={items.length} noun={noun} onMove={(idx, d) => onChange(moveItem(items, idx, d))} onRemove={(idx) => onChange(items.filter((_, j) => j !== idx))} />
          </div>
          {renderItem(item, i, of)}
        </div>
      ))}
      {items.length < max && (
        <button type="button" className="ed-btn ed-btn--ghost ed-btn--sm" onClick={() => onChange([...items, newItem()])}>
          <Icon name="plus" size={16} /> Add {noun}
        </button>
      )}
    </fieldset>
  )
}
