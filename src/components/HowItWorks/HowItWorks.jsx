import Reveal from '../Reveal/Reveal.jsx'
import SectionHeading from '../Section/SectionHeading.jsx'
import './HowItWorks.css'

const STEPS = [
  { title: 'Pick a template', text: 'Choose a design for your birthday, wedding, business or story.' },
  { title: 'Add your story', text: 'Add your photos, words, dates and details.' },
  { title: 'Share your link', text: 'Publish your page and send one link to everyone who matters.' },
]

export default function HowItWorks() {
  return (
    <section id="how" className="section how" aria-labelledby="how-title">
      <div className="container">
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="Live in three simple steps"
          intro="No design skills needed. Pick, personalise and share."
        />

        <Reveal as="ol" className="how__steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="how__step" style={{ '--step': index }}>
              <span className="how__number" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="how__title">
                <span className="sr-only">Step {index + 1}: </span>
                {step.title}
              </h3>
              <p className="how__text">{step.text}</p>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
