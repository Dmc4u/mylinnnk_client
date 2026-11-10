import Reveal from '../Reveal/Reveal.jsx'
import SectionHeading from '../Section/SectionHeading.jsx'
import MomentIcon from '../MomentIcon/MomentIcon.jsx'
import useSpotlight from '../../hooks/useSpotlight.js'
import { MOMENTS } from '../../utils/moments.js'
import './Moments.css'

export default function Moments() {
  const onPointerMove = useSpotlight()

  return (
    <section id="moments" className="section moments" aria-labelledby="moments-title">
      <div className="container">
        <SectionHeading
          id="moments-title"
          eyebrow="Moments"
          title="A page for every chapter of life"
          intro="Celebrate, announce, introduce or remember. MyLinnnk shapes itself around what matters to you."
        />

        <ul className="moments__grid">
          {MOMENTS.map((moment, index) => (
            <Reveal as="li" key={moment.id} delay={index * 100} className="moments__item">
              <article className="lift-card moment-card" onPointerMove={onPointerMove}>
                <div className="moment-card__cover" style={{ background: moment.cover }} aria-hidden="true">
                  <span className="moment-card__icon">
                    <MomentIcon paths={moment.icon} size={22} />
                  </span>
                </div>
                <div className="moment-card__body">
                  <h3 className="moment-card__title">{moment.label}</h3>
                  <p className="moment-card__text">{moment.blurb}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
