import { useId, useState } from 'react'
import { Link } from 'react-router'
import Reveal from '../../components/Reveal/Reveal.jsx'
import MagneticButton from '../../components/UI/MagneticButton.jsx'
import { FormAlert } from '../../components/Form/Form.jsx'
import { CONSENT_CATEGORIES, STORAGE_ITEMS, readConsent, saveConsent } from '../../utils/consent.js'
import { InfoHero, ScrollProgress } from '../InfoPages/InfoPageParts.jsx'

/**
 * /cookie-settings: what MyLinnnk stores in the browser and why. Toggles appear only for optional
 * categories, and there are none today (no analytics or advertising), so the page explains the
 * strictly necessary storage. `categories` is a prop so the optional path can be tested.
 */
export default function CookieSettingsPage({ categories = CONSENT_CATEGORIES }) {
  const ids = useId()
  const optional = categories.filter((c) => !c.required)
  const [choices, setChoices] = useState(() => readConsent(categories)?.choices ?? {})
  const [saved, setSaved] = useState(null)

  const save = (event) => {
    event.preventDefault()
    const record = saveConsent(choices, categories)
    setSaved(record.decidedAt)
  }

  return (
    <div className="info-page">
      <title>Cookie settings · MyLinnnk</title>
      <ScrollProgress />
      <InfoHero
        compact
        eyebrow="Cookie settings"
        lines={['Only what’s needed.', 'Nothing that tracks you.']}
        lead="MyLinnnk uses one essential cookie to keep you signed in, and your browser’s storage to keep your drafts and images safe on this device. We don’t use analytics, advertising or tracking cookies."
      />

      <div className="container">
        <Reveal className="info-tiles" as="div">
          {categories.map((c) => (
            <section key={c.id} className="info-tile" aria-labelledby={`${ids}-${c.id}`}>
              <h3 id={`${ids}-${c.id}`}>{c.title}</h3>
              <p>{c.description}</p>
              <p className="cookie-status">{c.required ? 'Always on' : choices[c.id] ? 'On' : 'Off'}</p>
            </section>
          ))}
        </Reveal>

        {optional.length > 0 ? (
          <Reveal as="form" className="info-card cookie-form" onSubmit={save} aria-label="Optional cookies">
            {saved && <FormAlert tone="success">Your choices are saved for this browser.</FormAlert>}
            {optional.map((c) => (
              <label key={c.id} className="cookie-toggle">
                <input type="checkbox" role="switch" checked={choices[c.id] === true} onChange={(e) => setChoices((prev) => ({ ...prev, [c.id]: e.target.checked }))} />
                <span>
                  <strong>{c.title}</strong> {c.description}
                </span>
              </label>
            ))}
            <MagneticButton type="submit">Save my choices</MagneticButton>
          </Reveal>
        ) : (
          <Reveal className="info-card cookie-none" as="div">
            <h2 className="info-intro__title">There’s nothing to switch off.</h2>
            <p className="info-intro__text">
              Everything MyLinnnk stores is needed for the site to work, so there are no optional cookies to choose. If we ever add an optional feature,
              it will appear here, off until you turn it on.
            </p>
          </Reveal>
        )}

        <Reveal as="section" className="cookie-list" aria-labelledby={`${ids}-list`}>
          <h2 id={`${ids}-list`} className="info-intro__title">
            What’s stored in your browser
          </h2>
          <table className="legal-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Why</th>
                <th scope="col">How long</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_ITEMS.map((item) => (
                <tr key={item.name}>
                  <td>
                    <code>{item.name}</code>
                  </td>
                  <td>{item.kind}</td>
                  <td>{item.purpose}</td>
                  <td>{item.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="info-intro__text">
            You can delete these at any time in your browser’s settings (“site data” for this site). Removing them signs you out and deletes drafts and
            images saved only on this device; pages saved to your account are not affected. See our <Link to="/privacy-policy">Privacy policy</Link> for
            more.
          </p>
        </Reveal>
      </div>
    </div>
  )
}
