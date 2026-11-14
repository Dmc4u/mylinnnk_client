import { CATEGORY_LABELS } from '../../data/templates.js'
import { PUBLISHING_GUARANTEES, planTerms, priceDescription, priceParts } from '../config/plans.js'
import usePlans from '../../components/Pricing/usePlans.js'
import Modal from './Modal.jsx'
import Icon from './icons.jsx'

/**
 * Save Draft: drafts are saved on this device (signed in or not). Saving to an
 * account arrives with cloud drafts; until then nothing claims otherwise.
 * Log in / Sign up open in a new tab so the editor (and this draft) stay open;
 * this tab learns about the new session automatically.
 */
export function SaveDraftDialog({ autosave, cloud = null, signedIn, user, onClose }) {
  if (cloud) return <CloudSaveDialog cloud={cloud} user={user} onClose={onClose} />
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

/**
 * Save Draft for cloud drafts: says exactly where the draft is. "Saved to your
 * account" only when the server confirmed it; images stay on this device.
 */
function CloudSaveDialog({ cloud, user, onClose }) {
  const saved = cloud.status === 'saved'
  return (
    <Modal
      title="Save your draft"
      onClose={onClose}
      footer={<button type="button" className="ed-btn ed-btn--primary" onClick={onClose}>Keep editing</button>}
    >
      <div className={`ed-notice ${saved ? 'ed-notice--ok' : 'ed-notice--warn'}`}>
        <Icon name={saved ? 'check' : 'info'} />
        <p>
          {saved
            ? `Saved to your account (${user?.email ?? 'signed in'}). You can reopen it on any device by logging in.`
            : `${cloud.text}. ${cloud.message ?? ''} Your changes are kept on this device until they reach your account.`}
        </p>
      </div>
      {cloud.pendingMedia > 0 && (
        <p className="ed-soon">
          <Icon name="image" size={16} /> {cloud.pendingMedia} {cloud.pendingMedia === 1 ? 'image hasn’t' : 'images haven’t'} reached your account yet. Images
          upload separately in the background from the device where they were added; until then other devices show the original template photo or a
          placeholder.
        </p>
      )}
    </Modal>
  )
}

/** Revision conflict: the user's edits are kept; nothing is overwritten or merged. */
export function ConflictDialog({ busy, onLoadNewer, onSaveCopy, onClose }) {
  return (
    <Modal
      title="This draft changed somewhere else"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ed-btn ed-btn--ghost" onClick={onClose}>Decide later</button>
          <button type="button" className="ed-btn" onClick={onLoadNewer} disabled={Boolean(busy)}>Load newer cloud version</button>
          <button type="button" className="ed-btn ed-btn--primary" onClick={onSaveCopy} disabled={Boolean(busy)}>
            {busy === 'copy' ? 'Saving copy…' : 'Save my version as a new copy'}
          </button>
        </>
      }
    >
      <p>
        A newer version of this draft was saved to your account from another tab or device. Your changes here have <b>not</b> been
        saved and nothing was overwritten. They’re kept on this device until you choose:
      </p>
      <ul className="ed-modal__list">
        <li><b>Load newer cloud version</b>: open the version from your account and discard your unsaved changes here.</li>
        <li><b>Save my version as a new copy</b>: keep both. Your version becomes a separate draft and the other one stays as it is.</li>
      </ul>
    </Modal>
  )
}

const FAMILIES = [
  { id: 'celebration', label: 'Personal event page', summary: 'Birthdays, anniversaries and weddings.' },
  { id: 'professional', label: 'Professional page', summary: 'Businesses, portfolios and community pages.' },
]

/**
 * Publish: shows the server's plans and prices (GET /plans) honestly. Paid
 * publishing doesn't exist yet: no payment, no order, no fake live URL.
 */
export function PublishDialog({ suggested, category, signedIn, cloudPageId = null, onClose }) {
  const { status, data, retry } = usePlans()
  const plans = data?.plans ?? []
  const custom = plans.find((p) => p.billing === 'custom_quote')
  // Only when the server offers checkout, for a page saved in the signed-in user's account.
  const canPublish = Boolean(data?.checkout?.available && signedIn && cloudPageId)
  return (
    <Modal
      size="lg"
      title="Publish your page"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ed-btn ed-btn--ghost" onClick={onClose}>Back to editing</button>
          {canPublish ? (
            <a className="ed-btn ed-btn--primary" href={`/publish/${cloudPageId}`}>Continue to publishing</a>
          ) : (
            <button type="button" className="ed-btn ed-btn--primary" disabled aria-describedby="publish-soon">Continue to payment</button>
          )}
        </>
      }
    >
      <p>
        Creating and editing your page is free. Publishing it at a public web address requires a publishing plan for this
        page. Prices are per published page and nothing renews automatically.
      </p>
      {!signedIn && (
        <div className="ed-notice">
          <Icon name="info" />
          <p>You’ll need a free account before you can pay and publish, so your page is linked to you.</p>
        </div>
      )}
      {status === 'loading' && <p className="ed-panel__hint" role="status">Loading prices…</p>}
      {status === 'error' && (
        <div className="ed-notice" role="alert">
          <Icon name="info" />
          <p>
            We couldn’t load the prices right now.{' '}
            <button type="button" className="ed-btn ed-btn--sm" onClick={retry}>Try again</button>
          </p>
        </div>
      )}
      {status === 'ready' && (
        <div className="ed-plans">
          {FAMILIES.map((family) => (
            <section key={family.id} className={`ed-plan${suggested === family.id ? ' is-suggested' : ''}`} aria-labelledby={`plan-${family.id}`}>
              {suggested === family.id && <span className="ed-plan__badge">Likely for this page</span>}
              <h3 id={`plan-${family.id}`}>{family.label}</h3>
              <p className="ed-plan__summary">{family.summary}</p>
              <ul className="ed-plan__options" aria-label={`${family.label} options`}>
                {plans.filter((p) => p.family === family.id).map((plan) => (
                  <li key={plan.id} data-plan={plan.id}>
                    <span className="ed-plan__option">
                      <span className="ed-plan__name">
                        {plan.name}
                        {plan.savings ? ` · save ${plan.savings.percent}%` : ''}
                      </span>
                      <span className="ed-plan__terms">{planTerms(plan)}</span>
                    </span>
                    <span className="ed-plan__price">
                      <span aria-hidden="true">{priceParts(plan, data.currency).amount}</span>
                      <span className="sr-only">{priceDescription(plan, data.currency)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {custom && <p className="ed-panel__hint">Need something bespoke? {custom.name} is quoted individually: price and duration agreed with you.</p>}
      <p className="ed-panel__hint">
        <a href="/pricing" target="_blank" rel="noopener">Compare all plans</a> (opens in a new tab, so this page stays open).
      </p>
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
        <Icon name="lock" size={16} />{' '}
        {canPublish
          ? data.checkout.test
            ? 'Test mode: payment details are placeholders. Don’t transfer real money.'
            : 'You’ll choose an address and a plan, then pay by bank transfer. Your page goes live once we confirm the payment.'
          : data?.checkout?.available && !cloudPageId
            ? 'Save this page to your account first, then publish it from here.'
            : 'Paid publishing is coming soon. Nothing is charged and your page is not published yet.'}
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
