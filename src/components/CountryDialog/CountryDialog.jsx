import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { countryOptions, filterCountries } from '../../config/countries.js'
import MagneticButton from '../UI/MagneticButton.jsx'
import './CountryDialog.css'

export const COUNTRY_UNAVAILABLE_MESSAGE = 'Sorry, this service is not available in your country yet.'

/**
 * "What is your country?", asked before every payment (publishing and renewal), on the native <dialog>
 * (focus trapped, Escape closes, focus returns to the button that opened it).
 *
 * The country is sent with the order; the API alone decides whether payment is possible there, so this
 * dialog knows nothing about which countries can pay. When the API says no, `unavailable` switches the
 * dialog to the one customer message with "Request a Quote" and "Contact Us".
 *
 * Props: initialCountry, busy, error (a message about the choice), unavailable,
 * quoteHref(countryCode) and contactHref (in-app routes: /request-quote, /contact), onContinue(code), onChange() (a new choice clears the answer), onClose().
 */
export default function CountryDialog({ initialCountry = null, busy = false, error = null, unavailable = false, quoteHref, contactHref, onContinue, onChange, onClose }) {
  const ref = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const titleId = useId()
  const inputId = useId()
  const listId = useId()
  const errorId = useId()
  const options = useMemo(() => countryOptions(), [])
  const initial = options.find((o) => o.code === initialCountry) ?? null
  const [selected, setSelected] = useState(initial)
  const [query, setQuery] = useState(initial?.name ?? '')
  const [listOpen, setListOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [localError, setLocalError] = useState(null)

  const matches = useMemo(() => (selected && query === selected.name ? options : filterCountries(options, query)), [options, query, selected])
  const optionId = (code) => `${listId}-${code}`

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.open && dialog.close()
  }, [])

  useEffect(() => {
    if (!listOpen) return
    const el = listRef.current?.querySelector(`[data-index="${active}"]`)
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [active, listOpen])

  const choose = (option) => {
    setSelected(option)
    setQuery(option.name)
    setListOpen(false)
    setLocalError(null)
    onChange?.()
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!listOpen) {
        setListOpen(true)
        const at = selected ? matches.findIndex((o) => o.code === selected.code) : 0
        setActive(Math.max(0, at))
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => Math.min(matches.length - 1, Math.max(0, i + step)))
    } else if (event.key === 'Home' && listOpen) {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End' && listOpen) {
      event.preventDefault()
      setActive(matches.length - 1)
    } else if (event.key === 'Enter') {
      if (listOpen && matches[active]) {
        event.preventDefault()
        choose(matches[active])
      }
    } else if (event.key === 'Escape' && listOpen) {
      // Close the list only; a second Escape closes the dialog.
      event.preventDefault()
      event.stopPropagation()
      setListOpen(false)
    }
  }

  const submit = (event) => {
    event.preventDefault()
    if (busy) return
    if (!selected) {
      setLocalError('Choose your country to continue.')
      inputRef.current?.focus()
      return
    }
    onContinue(selected.code)
  }

  const shownError = localError ?? error
  const expanded = listOpen && matches.length > 0

  return (
    <dialog
      ref={ref}
      className="country-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (listOpen) setListOpen(false)
        else if (!busy) onClose()
      }}
    >
      <p className="country-dialog__eyebrow">Before you pay</p>
      <h2 id={titleId} className="country-dialog__title">
        What is your country?
      </h2>

      {unavailable ? (
        <div className="country-dialog__unavailable" role="alert">
          <p className="country-dialog__message">{COUNTRY_UNAVAILABLE_MESSAGE}</p>
          <div className="country-dialog__actions">
            <MagneticButton to={quoteHref?.(selected?.code)} size="sm">
              Request a Quote
            </MagneticButton>
            <MagneticButton to={contactHref} variant="secondary" size="sm">
              Contact Us
            </MagneticButton>
          </div>
          <div className="country-dialog__footer">
            <button type="button" className="country-dialog__text-btn" onClick={() => onChange?.()}>
              Choose a different country
            </button>
            <button type="button" className="country-dialog__text-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <form className="country-dialog__form" onSubmit={submit} noValidate>
          <p className="country-dialog__lead">Choose the country you live in. We use it to show you the right way to pay.</p>
          <label className="country-dialog__label" htmlFor={inputId}>
            Country
          </label>
          <div className={`country-combo${shownError ? ' is-invalid' : ''}`}>
            <input
              ref={inputRef}
              id={inputId}
              className="country-combo__input"
              type="text"
              role="combobox"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search for your country"
              aria-autocomplete="list"
              aria-expanded={expanded}
              aria-controls={listId}
              aria-activedescendant={expanded && matches[active] ? optionId(matches[active].code) : undefined}
              aria-invalid={shownError ? 'true' : undefined}
              aria-describedby={shownError ? errorId : undefined}
              value={query}
              disabled={busy}
              onChange={(event) => {
                setQuery(event.target.value)
                setListOpen(true)
                setActive(0)
                setLocalError(null)
                if (selected && event.target.value !== selected.name) {
                  setSelected(null)
                  onChange?.()
                }
              }}
              onFocus={() => setListOpen(true)}
              onClick={() => setListOpen(true)}
              onBlur={() => setListOpen(false)}
              onKeyDown={onKeyDown}
            />
            <span className="country-combo__chevron" aria-hidden="true" />
            <ul ref={listRef} id={listId} className="country-combo__list" role="listbox" aria-label="Countries" hidden={!expanded}>
              {expanded &&
                matches.map((o, i) => (
                  <li
                    key={o.code}
                    id={optionId(o.code)}
                    data-index={i}
                    role="option"
                    aria-selected={selected?.code === o.code}
                    className={`country-combo__option${i === active ? ' is-active' : ''}`}
                    // mousedown, so the choice lands before the input's blur closes the list
                    onMouseDown={(event) => {
                      event.preventDefault()
                      choose(o)
                    }}
                    onMouseMove={() => setActive(i)}
                  >
                    {o.name}
                  </li>
                ))}
            </ul>
          </div>
          {listOpen && matches.length === 0 && (
            <p className="country-dialog__hint" role="status">
              No country matches “{query.trim()}”.
            </p>
          )}
          {shownError && (
            <p id={errorId} className="country-dialog__error" role="alert">
              {shownError}
            </p>
          )}
          <div className="country-dialog__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <MagneticButton type="submit" size="sm" loading={busy} loadingLabel="Checking…">
              Continue
            </MagneticButton>
          </div>
        </form>
      )}
    </dialog>
  )
}
