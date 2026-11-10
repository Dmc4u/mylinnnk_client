import { CATEGORY_LABELS } from '../../data/templates.js'
import { PUBLISHING_GUARANTEES, describeBilling } from '../config/plans.js'
import Modal from './Modal.jsx'
import Icon from './icons.jsx'

/**
 * Save Draft: drafts are saved on this device (signed in or not). Saving to an
 * account arrives with cloud drafts; until then nothing claims otherwise.
 * Log in / Sign up open in a new tab so the editor (and this draft) stay open;
 * this tab learns about the new session automatically.
 */
export function SaveDraftDialog({ autosave, signedIn, user, onClose }) {
  const savedLocally = autosave.status === 'saved'
  return (
    <Modal
      title="Save your draft"
      onClose={onClose}
      footer={
        signedIn ? (
          <button type="button" className="ed-btn ed-btn--primary" onClick={onClose}>Keep editing</button>
        ) : (
          <>
            <button type="button" className="ed-btn ed-btn--ghost" onClick={onClose}>Keep editing</button>
            <a className="ed-btn" href="/login" target="_blank" rel="noopener" aria-describedby="account-new-tab">Log in</a>
            <a className="ed-btn ed-btn--primary" href="/signup" target="_blank" rel="noopener" aria-describedby="account-new-tab">Sign up free</a>
          </>
        )
      }
    >
      <div className={`ed-notice ${savedLocally ? 'ed-notice--ok' : 'ed-notice--warn'}`}>
        <Icon name={savedLocally ? 'check' : 'info'} />
        <p>
          {savedLocally
            ? 'Your draft is saved on this device. It is not saved to any account.'
            : autosave.error ?? 'This browser could not store your draft. Keep this tab open while you edit.'}
        </p>
      </div>
      {signedIn ? (
        <p>
          You’re logged in as <b>{user?.displayName}</b>.
        </p>
      ) : (
        <>
          <p>
            To keep drafts safe across devices and come back to them anytime, you’ll need a <b>free MyLinnnk account</b>.
            Your current draft will stay on this device while you sign up.
          </p>
          <p className="ed-hint" id="account-new-tab">Log in and sign up open in a new tab, so you won’t lose your place here.</p>
        </>
      )}
      <p className="ed-soon" id="account-soon">
        <Icon name="lock" size={16} /> Saving to your account is coming soon. Until then, drafts live only in this browser:
        clearing browser data, switching devices or private browsing can remove them.
      </p>
    </Modal>
  )
}

/** Publish: explains the plan model honestly. No payment, no fake live URL. */
export function PublishDialog({ options, category, signedIn, onClose }) {
  return (
    <Modal
      size="lg"
      title="Publish your page"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ed-btn ed-btn--ghost" onClick={onClose}>Back to editing</button>
          <button type="button" className="ed-btn ed-btn--primary" disabled aria-describedby="publish-soon">Continue to payment</button>
        </>
      }
    >
      <p>
        Creating and editing your page is free. Publishing it at a public web address requires a publishing plan.
      </p>
      {!signedIn && (
        <div className="ed-notice">
          <Icon name="info" />
          <p>You’ll need a free account before you can pay and publish, so your page is linked to you.</p>
        </div>
      )}
      <div className="ed-plans">
        {options.families.map((family) => (
          <section key={family.id} className={`ed-plan${options.suggested === family.id ? ' is-suggested' : ''}`} aria-labelledby={`plan-${family.id}`}>
            {options.suggested === family.id && <span className="ed-plan__badge">Likely for this page</span>}
            <h3 id={`plan-${family.id}`}>{family.label}</h3>
            <p className="ed-plan__summary">{family.summary}</p>
            <ul>
              {family.points.map((p) => (
                <li key={p}>
                  <Icon name="check" size={16} /> {p}
                </li>
              ))}
            </ul>
            <ul className="ed-plan__options" aria-label={`${family.label} options`}>
              {family.plans.map((plan) => (
                <li key={plan.id} data-plan={plan.id}>
                  <span className="ed-plan__option">
                    <span className="ed-plan__name">{plan.label}</span>
                    <span className="ed-plan__terms">{describeBilling(plan)}</span>
                  </span>
                  <span className="ed-plan__price">{plan.price == null ? 'Price to be announced' : plan.price}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <ul className="ed-guarantees">
        {PUBLISHING_GUARANTEES.map((g) => (
          <li key={g}>
            <Icon name="check" size={16} /> {g}
          </li>
        ))}
      </ul>
      <p className="ed-panel__hint">
        {category ? `This page uses a ${CATEGORY_LABELS[category] ?? category} template. ` : ''}
        The plan that applies is confirmed when you publish, based on how the page will be used.
      </p>
      <p className="ed-soon" id="publish-soon">
        <Icon name="lock" size={16} /> Publishing and payments are coming soon. Nothing is charged and your page is not published yet.
      </p>
    </Modal>
  )
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }) {
  return (
    <Modal
      size="sm"
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ed-btn ed-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="ed-btn ed-btn--danger" onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  )
}
