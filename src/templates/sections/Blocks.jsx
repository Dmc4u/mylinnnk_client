import { Action, Eyebrow, Img, MenuLink, Ornament } from '../primitives.jsx'

const Heading = ({ eyebrow, title, className = '' }) =>
  eyebrow || title ? (
    <header className={`ts-heading ${className}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      {title && <h3 className="ts-display ts-heading__title">{title}</h3>}
    </header>
  ) : null

const Paragraphs = ({ text, className = 'ts-body' }) =>
  String(text ?? '')
    .split('\n\n')
    .filter(Boolean)
    .map((p, i) => (
      <p key={i} className={className}>
        {p}
      </p>
    ))

/* ---------------- Navigation ---------------- */
export function Nav({ variant, content: c }) {
  if (variant === 'chapters') {
    // Chapter menu: real links (usually to #sections); scrolls sideways on narrow screens.
    const items = (c.items ?? []).filter((item) => item?.label)
    return (
      <nav className="ts-nav__row" aria-label="Chapters">
        {c.brand && <strong className="ts-nav__brand">{c.brand}</strong>}
        {items.length > 0 && (
          <ul className="ts-nav__chapters">
            {items.map((item, i) => (
              <li key={`${i}:${item.label}`}>
                <MenuLink href={item.href}>{item.label}</MenuLink>
              </li>
            ))}
          </ul>
        )}
      </nav>
    )
  }
  const links = c.links ?? []
  if (variant === 'centered') {
    const half = Math.ceil(links.length / 2)
    return (
      <nav className="ts-nav__row">
        <span className="ts-nav__links">{links.slice(0, half).map((l) => <span key={l}>{l}</span>)}</span>
        <strong className="ts-nav__brand">{c.brand}</strong>
        <span className="ts-nav__links">{links.slice(half).map((l) => <span key={l}>{l}</span>)}</span>
      </nav>
    )
  }
  return (
    <nav className="ts-nav__row">
      <strong className="ts-nav__brand">{c.brand}</strong>
      <span className="ts-nav__links">{links.map((l) => <span key={l}>{l}</span>)}</span>
      {c.cta && <Action variant="small">{c.cta}</Action>}
    </nav>
  )
}

/* ---------------- Details: ticket | inline | cards | stickers ---------------- */
export function Details({ variant, content: c }) {
  const items = c.items ?? []
  return (
    <>
      <Heading eyebrow={c.eyebrow} title={c.title} />
      <dl className={`ts-details__list ts-details__list--${variant}`}>
        {items.map((item) => (
          <div key={item.label} className="ts-details__item">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
        {variant === 'ticket' && c.note && <p className="ts-details__stub">{c.note}</p>}
      </dl>
    </>
  )
}

/* ---------------- Text: centered | split | dropcap | letter ---------------- */
export function Text({ variant, content: c, options = {} }) {
  if (variant === 'split') {
    return (
      <div className={`ts-text__split ts-side-${options.imageSide ?? 'left'}`}>
        <Img image={c.image} className="ts-text__img" />
        <div className="ts-text__copy">
          <Heading eyebrow={c.eyebrow} title={c.title} />
          <Paragraphs text={c.body} />
          <Action variant="outline" href={c.ctaHref}>{c.cta}</Action>
        </div>
      </div>
    )
  }
  if (variant === 'essay') {
    // Editorial photo essay: a full-width photograph, then a narrow reading column.
    return (
      <div className="ts-text__essay">
        <figure className="ts-text__essay-figure">
          <Img image={c.image} className="ts-text__essay-img" />
          {c.image?.caption && <figcaption>{c.image.caption}</figcaption>}
        </figure>
        <div className="ts-text__essay-copy">
          <Heading eyebrow={c.eyebrow} title={c.title} />
          <Paragraphs text={c.body} />
        </div>
      </div>
    )
  }
  if (variant === 'letter') {
    return (
      <div className="ts-text__paper">
        <Heading eyebrow={c.eyebrow} title={c.title} />
        <Paragraphs text={c.body} className="ts-text__handwriting" />
        {c.signature && <p className="ts-text__signature">{c.signature}</p>}
      </div>
    )
  }
  if (variant === 'dropcap') {
    return (
      <div className="ts-text__editorial">
        <Heading eyebrow={c.eyebrow} title={c.title} />
        <div className="ts-text__columns">
          <Paragraphs text={c.body} />
        </div>
      </div>
    )
  }
  return (
    <div className="ts-text__center">
      <Heading eyebrow={c.eyebrow} title={c.title} />
      <Paragraphs text={c.body} />
      <Action variant="outline" href={c.ctaHref}>{c.cta}</Action>
    </div>
  )
}

/* ---------------- Gallery: masonry | filmstrip | polaroids | mosaic ---------------- */
export function Gallery({ variant, content: c }) {
  const images = c.images ?? []
  return (
    <>
      <Heading eyebrow={c.eyebrow} title={c.title} />
      <div className={`ts-gallery__grid ts-gallery__grid--${variant}`}>
        {images.map((image, i) => (
          <figure key={image.src ?? i} className={`ts-gallery__item ts-gallery__item--${i}`}>
            <Img image={image} />
            {image.caption && <figcaption>{image.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </>
  )
}

/* ---------------- Timeline: vertical | schedule | years ---------------- */
export function Timeline({ variant, content: c }) {
  return (
    <>
      <Heading eyebrow={c.eyebrow} title={c.title} />
      <ol className={`ts-timeline__list ts-timeline__list--${variant}`}>
        {(c.items ?? []).map((item) => (
          <li key={`${item.label}-${item.title}`} className="ts-timeline__item">
            <span className="ts-timeline__label">{item.label}</span>
            <div className="ts-timeline__body">
              {item.image && <Img image={item.image} className="ts-timeline__img" />}
              {item.title && <strong className="ts-timeline__title">{item.title}</strong>}
              {item.text && <span className="ts-timeline__text">{item.text}</span>}
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}

/* ---------------- List: numbered | menu | columns | lineup ---------------- */
export function List({ variant, content: c }) {
  return (
    <>
      <Heading eyebrow={c.eyebrow} title={c.title} />
      {c.intro && <p className="ts-body ts-list__intro">{c.intro}</p>}
      <ul className={`ts-list__items ts-list__items--${variant}`}>
        {(c.items ?? []).map((item, i) => (
          <li key={item.title} className="ts-list__item">
            {(variant === 'tiles' || variant === 'people') && item.image && (item.image.src || item.image.mediaId) && <Img image={item.image} className="ts-list__img" />}
            {(variant === 'numbered' || variant === 'tiles') && <span className="ts-list__num">{String(i + 1).padStart(2, '0')}</span>}
            <span className="ts-list__title">{item.title}</span>
            {variant === 'menu' && <span className="ts-list__leader" aria-hidden="true" />}
            {item.meta && <span className="ts-list__meta">{item.meta}</span>}
            {item.text && <span className="ts-list__text">{item.text}</span>}
          </li>
        ))}
      </ul>
    </>
  )
}

/* ---------------- Stats ---------------- */
export function Stats({ variant = 'big', content: c }) {
  return (
    <>
      <Heading eyebrow={c.eyebrow} title={c.title} />
      <dl className={`ts-stats__row ts-stats__row--${variant}`}>
        {(c.items ?? []).map((s) => (
          <div key={s.label} className="ts-stats__item">
            <dt>{s.label}</dt>
            {/* The value as text for assistive technology; the visible copy may count up to it (motion). */}
            <dd className="ts-display">
              <span className="sr-only">{s.value}</span>
              <span aria-hidden="true" data-countup={s.value}>
                {s.value}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </>
  )
}

/* ---------------- Quote: large | banner ---------------- */
export function Quote({ content: c }) {
  return (
    <figure className="ts-quote__figure">
      <blockquote className="ts-display ts-quote__text">{c.text}</blockquote>
      {c.author && <figcaption className="ts-quote__author">{c.author}</figcaption>}
    </figure>
  )
}

/* ---------------- Countdown (static numbers in previews) ---------------- */
export function Countdown({ content: c, ornament }) {
  return (
    <div className="ts-countdown__wrap">
      {ornament === 'botanical' && <Ornament kind="divider" className="ts-countdown__divider" />}
      <Eyebrow>{c.eyebrow}</Eyebrow>
      <dl className="ts-countdown__row">
        {(c.parts ?? []).map((p) => (
          <div key={p.unit} className="ts-countdown__part">
            <dd className="ts-display">{p.value}</dd>
            <dt>{p.unit}</dt>
          </div>
        ))}
      </dl>
      {c.note && <p className="ts-body">{c.note}</p>}
    </div>
  )
}

/* ---------------- Progress (fundraising) ---------------- */
export function Progress({ content: c }) {
  const percent = Math.max(0, Math.min(100, Number(c.percent) || 0))
  return (
    <div className="ts-progress__wrap">
      <Heading eyebrow={c.eyebrow} title={c.title} />
      <div className="ts-progress__figures">
        <span className="ts-display">{c.raised}</span>
        <span>raised of {c.goal}</span>
      </div>
      <div className="ts-progress__track" role="img" aria-label={`${percent}% of goal raised`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      {c.note && <p className="ts-body">{c.note}</p>}
    </div>
  )
}

/* ---------------- Call to action: banner | centered | signature ---------------- */
export function Cta({ variant, content: c }) {
  return (
    <div className="ts-cta__inner">
      {variant === 'signature' ? (
        <p className="ts-script ts-cta__title">{c.title}</p>
      ) : (
        <h3 className="ts-display ts-cta__title">{c.title}</h3>
      )}
      {c.text && <p className="ts-body">{c.text}</p>}
      <Action variant={variant === 'banner' ? 'inverse' : 'solid'} href={c.buttonHref}>{c.button}</Action>
    </div>
  )
}

/* ---------------- Contact ---------------- */
export function Contact({ content: c }) {
  return (
    <div className="ts-contact__grid">
      <Heading eyebrow={c.eyebrow} title={c.title} />
      <dl className="ts-contact__lines">
        {(c.lines ?? []).map((l) => (
          <div key={l.label}>
            <dt>{l.label}</dt>
            <dd>{l.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ---------------- Marquee (scrolling words) ---------------- */
export function Marquee({ content: c }) {
  const words = c.items ?? []
  const run = (
    <span className="ts-marquee__run">
      {words.map((w) => (
        <span key={w}>
          {w}
          <i aria-hidden="true">✦</i>
        </span>
      ))}
    </span>
  )
  return (
    <div className="ts-marquee__track" aria-label={words.join(', ')} role="img">
      {run}
      {run}
    </div>
  )
}
