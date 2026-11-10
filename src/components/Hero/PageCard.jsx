import MomentIcon from '../MomentIcon/MomentIcon.jsx'

/**
 * A miniature personalised web page, used as a floating element in the hero.
 * Layers: .page-card (position + parallax) → __float (bob) → __body (tilt + hover).
 */
export default function PageCard({ moment, style }) {
  return (
    <div className={`page-card page-card--${moment.id}`} style={style}>
      <div className="page-card__float">
        <div className="page-card__body">
          <div className="page-card__chrome">
            <span className="page-card__dots" />
            <span className="page-card__url">{moment.url}</span>
          </div>
          <div className="page-card__cover" style={{ background: moment.cover }}>
            <span className="page-card__icon">
              <MomentIcon paths={moment.icon} size={20} />
            </span>
          </div>
          <div className="page-card__content">
            <span className="page-card__label">{moment.label}</span>
            <strong className="page-card__title">{moment.title}</strong>
            <span className="page-card__meta">{moment.meta}</span>
            <span className="page-card__lines">
              <i />
              <i />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
