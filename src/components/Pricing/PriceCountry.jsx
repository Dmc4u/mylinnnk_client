import { useId, useMemo, useState } from 'react'
import { countryOptions } from '../../config/countries.js'

/**
 * A small "Change country" control above the plan stack: the visitor's own choice, kept on this device only.
 * Without one, a country reported by a trusted edge proxy may be preselected (`detected`; said to screen
 * readers as "not verified"); choosing always replaces it. Each card explains its own price (an estimate
 * shows the exact NGN amount payable beneath it), so no extra paragraphs are needed here.
 */
export default function PriceCountry({ country, onChange, detected = false }) {
  const id = useId()
  const options = useMemo(() => countryOptions(), [])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(country ?? '')
  const name = options.find((o) => o.code === country)?.name

  if (!editing) {
    return (
      <div className="price-country">
        <button
          type="button"
          className="price-country__pill"
          aria-label={name ? `Prices for ${name}${detected ? ' (from your connection; not verified)' : ''}. Change country` : 'Change country'}
          onClick={() => {
            setDraft(country ?? '')
            setEditing(true)
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
            <path d="M1.9 8h12.2M8 1.75c1.7 1.8 2.5 3.9 2.5 6.25S9.7 12.45 8 14.25C6.3 12.45 5.5 10.35 5.5 8S6.3 3.55 8 1.75Z" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          {name && <span className="price-country__name">{name}</span>}
          <span className="price-country__action">Change country</span>
        </button>
      </div>
    )
  }

  return (
    <div className="price-country">
      <form
        className="price-country__form"
        onSubmit={(e) => {
          e.preventDefault()
          onChange(draft || null)
          setEditing(false)
        }}
      >
        <label htmlFor={`${id}-select`}>Your country</label>
        <select id={`${id}-select`} value={draft} onChange={(e) => setDraft(e.target.value)}>
          <option value="">Not chosen (show US-dollar estimates)</option>
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </select>
        <button type="submit" className="price-country__save">
          Show prices
        </button>
        <button type="button" className="price-country__cancel" onClick={() => setEditing(false)}>
          Cancel
        </button>
        <p className="price-country__privacy">Saved on this device only. You confirm your country again when you pay.</p>
      </form>
    </div>
  )
}
