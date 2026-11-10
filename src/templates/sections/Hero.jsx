import { Action, Eyebrow, Img, Ornament } from '../primitives.jsx'

/**
 * Character count of the title's longest word. CSS uses it on narrow screens
 * to shrink the title just enough for that word to fit on one line.
 */
const longestWord = (text) => Math.max(1, ...String(text ?? '').split(/\s+/).map((w) => w.length))

/** Splits "Line one\nLine two" into separate lines for display titles. */
const Lines = ({ text }) =>
  String(text ?? '')
    .split('\n')
    .map((line, i) => (
      <span key={i} className="ts-line">
        {line}
      </span>
    ))

/**
 * Hero variants:
 *  cover     full-bleed photo with overlaid copy   options: align, overlay, height
 *  split     copy beside a photo                    options: imageSide, imageShape
 *  arch      photo in an arch, script title         (romantic)
 *  poster    giant stacked type over a duotone photo (events)
 *  collage   scattered polaroids around the title   (playful)
 *  editorial type-only headline with a meta row     (portfolios)
 *  framed    matted photo under a centred title     (classic)
 */
export default function Hero({ variant, content: c, options = {}, ornament }) {
  switch (variant) {
    case 'split':
      return (
        <div className={`ts-hero__grid ts-side-${options.imageSide ?? 'right'} ts-shape-${options.imageShape ?? 'rect'}`}>
          <div className="ts-hero__copy">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 className="ts-display ts-hero__title" style={{ '--title-longest': longestWord(c.title) }}>
              <Lines text={c.title} />
            </h2>
            {c.subtitle && <p className="ts-hero__subtitle">{c.subtitle}</p>}
            {c.meta && <p className="ts-hero__meta">{c.meta}</p>}
            <Action>{c.cta}</Action>
          </div>
          <div className="ts-hero__media">
            <Img image={c.image} eager />
            {c.badge && <span className="ts-hero__badge">{c.badge}</span>}
          </div>
        </div>
      )

    case 'arch':
      return (
        <div className="ts-hero__arch">
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <div className="ts-hero__arch-frame">
            {ornament === 'botanical' && <Ornament kind="botanical" className="ts-hero__sprig ts-hero__sprig--l" />}
            <Img image={c.image} eager />
            {ornament === 'botanical' && <Ornament kind="botanical" className="ts-hero__sprig ts-hero__sprig--r" />}
          </div>
          <h2 className="ts-script ts-hero__title" style={{ '--title-longest': longestWord(c.title) }}>{c.title}</h2>
          {c.subtitle && <p className="ts-hero__subtitle">{c.subtitle}</p>}
          <Ornament kind="divider" className="ts-hero__divider" />
          {c.meta && <p className="ts-hero__meta">{c.meta}</p>}
        </div>
      )

    case 'poster':
      return (
        <div className="ts-hero__poster">
          <Img image={c.image} eager className="ts-hero__poster-img" />
          <div className="ts-hero__poster-copy">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 className="ts-display ts-hero__title" style={{ '--title-longest': longestWord(c.title) }}>
              <Lines text={c.title} />
            </h2>
            {c.subtitle && <p className="ts-hero__subtitle">{c.subtitle}</p>}
          </div>
          {c.meta && <p className="ts-hero__strip">{c.meta}</p>}
        </div>
      )

    case 'collage':
      return (
        <div className="ts-hero__collage">
          {ornament === 'confetti' && <Ornament kind="confetti" className="ts-hero__confetti" />}
          <div className="ts-hero__photos">
            {(c.images ?? []).slice(0, 3).map((image, i) => (
              <figure key={image.src ?? i} className={`ts-polaroid ts-polaroid--${i}`}>
                <Img image={image} eager />
              </figure>
            ))}
          </div>
          <div className="ts-hero__copy">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 className="ts-display ts-hero__title" style={{ '--title-longest': longestWord(c.title) }}>
              <Lines text={c.title} />
            </h2>
            {c.subtitle && <p className="ts-hero__subtitle">{c.subtitle}</p>}
            <Action>{c.cta}</Action>
          </div>
        </div>
      )

    case 'editorial':
      return (
        <div className="ts-hero__editorial">
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <h2 className="ts-display ts-hero__title" style={{ '--title-longest': longestWord(c.title) }}>
            <Lines text={c.title} />
          </h2>
          <div className="ts-hero__editorial-foot">
            {c.subtitle && <p className="ts-hero__subtitle">{c.subtitle}</p>}
            {c.tags?.length > 0 && (
              <ul className="ts-hero__metalist">
                {c.tags.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )

    case 'framed':
      return (
        <div className="ts-hero__framed">
          {ornament === 'stars' && <Ornament kind="stars" className="ts-hero__stars" />}
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <h2 className="ts-display ts-hero__title" style={{ '--title-longest': longestWord(c.title) }}>
            <Lines text={c.title} />
          </h2>
          {c.subtitle && <p className="ts-hero__subtitle">{c.subtitle}</p>}
          <figure className="ts-hero__mat">
            <Img image={c.image} eager />
            {c.image?.caption && <figcaption>{c.image.caption}</figcaption>}
          </figure>
        </div>
      )

    case 'cover':
    default:
      return (
        <div
          className={`ts-hero__cover ts-align-${options.align ?? 'center'} ts-overlay-${options.overlay ?? 'dark'} ts-height-${options.height ?? 'tall'}`}
        >
          <Img image={c.image} eager className="ts-hero__bg" />
          <div className="ts-hero__copy">
            {ornament === 'stars' && <Ornament kind="stars" className="ts-hero__stars" />}
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 className="ts-display ts-hero__title" style={{ '--title-longest': longestWord(c.title) }}>
              <Lines text={c.title} />
            </h2>
            {c.subtitle && <p className="ts-hero__subtitle">{c.subtitle}</p>}
            {c.meta && <p className="ts-hero__meta">{c.meta}</p>}
            <Action variant={options.ctaStyle ?? 'solid'}>{c.cta}</Action>
          </div>
        </div>
      )
  }
}
