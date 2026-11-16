import { useState } from 'react'
import CopyButton from '../CopyButton/CopyButton.jsx'
import MagneticButton from '../UI/MagneticButton.jsx'
import { canShareNatively, emailShareUrl, facebookShareUrl, shareText, whatsappShareUrl } from '../../utils/share.js'
import './ShareLinks.css'

/** Small, recognisable glyphs (decorative: each button also has its name as text). */
const ICONS = {
  whatsapp: (
    <path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 1.8a7.9 7.9 0 1 1-4.1 14.6l-.3-.2-3 .8.8-2.9-.2-.3A7.9 7.9 0 0 1 12 4Zm-3.4 4.2c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.2 5 4.3 2.4 1 2.9.8 3.5.7.5 0 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4l-.5-.3-1.8-.9c-.3-.1-.5-.1-.7.2l-.8 1c-.1.2-.3.2-.6.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3l.1-.4-.1-.4-.8-1.9c-.2-.5-.4-.4-.6-.4h-.4Z" />
  ),
  facebook: <path d="M13.4 21.5v-7.7H16l.4-3h-3V8.9c0-.9.3-1.5 1.5-1.5h1.6V4.7c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.7v3h2.6v7.7h3.1Z" />,
  email: <path d="M3.5 5.5h17c.6 0 1 .4 1 1v11c0 .6-.4 1-1 1h-17c-.6 0-1-.4-1-1v-11c0-.6.4-1 1-1Zm.9 2.1v9.1h15.2V7.6l-7 5.2a1 1 0 0 1-1.2 0l-7-5.2Zm1.8-.3L12 11.6l5.8-4.3H6.2Z" />,
  share: <path d="M17 3.5a3 3 0 1 1-2.7 4.3L9.6 10.3a3 3 0 0 1 0 3.4l4.7 2.5A3 3 0 1 1 13.8 18l-4.8-2.5a3 3 0 1 1 0-7L13.8 6A3 3 0 0 1 17 3.5Z" />,
}
const Icon = ({ name }) => (
  <svg className="share-chip__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {ICONS[name]}
  </svg>
)

/**
 * View, copy and share a live page's address. `url` is the server's address for the page; `local`
 * (the site runs on this computer only) shows that the link isn't one other people can open yet.
 * `compact` (the account's expandable panel) shows only the share options: View and Copy Link are
 * already next to it. The browser's share sheet is offered only where it exists; Copy Link is the fallback.
 */
export default function ShareLinks({ url, title, local = false, compact = false }) {
  const [shareFailed, setShareFailed] = useState(false)
  const nativeShare = async () => {
    setShareFailed(false)
    try {
      await navigator.share({ title: title || 'My MyLinnnk page', text: shareText(title), url })
    } catch (error) {
      if (error?.name !== 'AbortError') setShareFailed(true) // closing the sheet isn't an error
    }
  }
  const external = { target: '_blank', rel: 'noopener noreferrer' }
  return (
    <div className={`share-links${compact ? ' share-links--compact' : ''}`}>
      {!compact && (
        <div className="share-links__row">
          <MagneticButton href={url} size="sm" {...external}>
            View My Page
          </MagneticButton>
          <CopyButton value={url} label="Copy Link" className="btn btn--ghost btn--sm" />
        </div>
      )}
      <div className="share-links__chips" role="group" aria-label="Share your page">
        <a className="share-chip share-chip--whatsapp" href={whatsappShareUrl(url, title)} {...external}>
          <Icon name="whatsapp" />
          <span>WhatsApp</span>
        </a>
        <a className="share-chip share-chip--facebook" href={facebookShareUrl(url)} {...external}>
          <Icon name="facebook" />
          <span>Facebook</span>
        </a>
        <a className="share-chip share-chip--email" href={emailShareUrl(url, title)}>
          <Icon name="email" />
          <span>Email</span>
        </a>
        {canShareNatively() && (
          <button type="button" className="share-chip share-chip--more" onClick={nativeShare}>
            <Icon name="share" />
            <span>More…</span>
          </button>
        )}
      </div>
      {shareFailed && (
        <p className="share-links__note" role="status">
          Sharing isn’t available here. Use Copy Link instead.
        </p>
      )}
      {local && (
        <p className="share-links__note share-links__note--dev" role="note">
          Development link: this address only works on this computer while MyLinnnk runs here. Other people can open your page once
          MyLinnnk is online at its public address.
        </p>
      )}
    </div>
  )
}
