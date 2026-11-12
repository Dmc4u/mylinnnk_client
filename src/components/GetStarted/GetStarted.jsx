import Reveal from '../Reveal/Reveal.jsx'
import Button from '../Button/Button.jsx'
import BrandMark from '../Brand/BrandMark.jsx'
import { CREATE_PAGE_HREF } from '../../utils/navigation.js'
import './GetStarted.css'

/** Small lights resting on the orbit rings: angle (deg, 0 = right, -90 = up) and ring radius (px). */
const ORBIT_LIGHTS = [
  { a: -158, r: 448, tone: 'teal' },
  { a: -124, r: 320, tone: 'white' },
  { a: -62, r: 384, tone: 'purple' },
  { a: -22, r: 576, tone: 'teal' },
  { a: -96, r: 640, tone: 'white' },
]

/**
 * Homepage closing section. Its background (navy, concentric orbit rings and
 * light) is anchored to its bottom edge, and the homepage footer
 * (<Footer continuous>) continues the same background from its top edge, so the
 * call to action and the footer read as one closing section.
 */
export default function GetStarted() {
  return (
    <section id="get-started" className="get-started" aria-labelledby="get-started-title">
      <Reveal className="get-started__orbits" aria-hidden="true">
        {ORBIT_LIGHTS.map((o) => (
          <span key={`${o.a}-${o.r}`} className="get-started__orbit" style={{ '--a': `${o.a}deg`, '--r': `${o.r}px` }}>
            <span className={`get-started__light get-started__light--${o.tone}`} />
          </span>
        ))}
      </Reveal>

      <div className="container get-started__content">
        <Reveal className="get-started__mark-wrap">
          <BrandMark size={64} variant="dark" className="get-started__mark" />
        </Reveal>
        <Reveal as="h2" id="get-started-title" className="get-started__title" delay={90}>
          Ready to tell your <span className="get-started__accent">story?</span>
        </Reveal>
        <Reveal as="p" className="get-started__text" delay={180}>
          Your moments deserve a page of their own.
        </Reveal>
        <Reveal className="get-started__action" delay={270}>
          <Button to={CREATE_PAGE_HREF} className="get-started__cta">
            Create Your Page Free
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
