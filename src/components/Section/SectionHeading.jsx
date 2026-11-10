import Reveal from '../Reveal/Reveal.jsx'
import './Section.css'

export default function SectionHeading({ eyebrow, title, intro, id }) {
  return (
    <Reveal className="section-heading">
      {eyebrow && <p className="section-heading__eyebrow">{eyebrow}</p>}
      <h2 id={id} className="section-heading__title">
        {title}
      </h2>
      {intro && <p className="section-heading__intro">{intro}</p>}
    </Reveal>
  )
}
