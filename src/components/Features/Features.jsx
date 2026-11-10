import Reveal from '../Reveal/Reveal.jsx'
import SectionHeading from '../Section/SectionHeading.jsx'
import MomentIcon from '../MomentIcon/MomentIcon.jsx'
import useSpotlight from '../../hooks/useSpotlight.js'
import './Features.css'

const FEATURES = [
  {
    title: 'Templates for every moment',
    text: 'Start from a design made for birthdays, weddings, businesses or stories — then make it yours.',
    icon: ['M4 4h7v7H4z', 'M13 4h7v4h-7z', 'M13 10h7v10h-7z', 'M4 13h7v7H4z'],
  },
  {
    title: 'One link to share',
    text: 'Your page lives at its own link, ready for messages, invitations and social bios.',
    icon: ['M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1', 'M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1'],
  },
  {
    title: 'Beautiful on every screen',
    text: 'Pages adapt to phones, tablets and desktops, so everyone sees your story at its best.',
    icon: ['M3 5h13v10H3z', 'M7 19h5', 'M9.5 15v4', 'M17 9h4v11h-4z'],
  },
]

export default function Features() {
  const onPointerMove = useSpotlight()

  return (
    <section id="features" className="section features" aria-labelledby="features-title">
      <div className="container">
        <SectionHeading
          id="features-title"
          eyebrow="Features"
          title={
            <>
              Everything your page needs, <span className="text-gradient">nothing it doesn’t.</span>
            </>
          }
          intro="Simple tools that turn photos, words and plans into a page people love to open."
        />

        <div className="features__grid">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 120} className="features__item">
              <article className="lift-card feature-card" onPointerMove={onPointerMove}>
                <span className="feature-card__icon">
                  <MomentIcon paths={feature.icon} size={24} />
                </span>
                <h3 className="feature-card__title">{feature.title}</h3>
                <p className="feature-card__text">{feature.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
