import { useRef } from 'react'
import Button from '../Button/Button.jsx'
import PageCard from './PageCard.jsx'
import usePointerParallax from '../../hooks/usePointerParallax.js'
import { MOMENTS } from '../../utils/moments.js'
import { SIGNUP_HREF } from '../../utils/navigation.js'
import './Hero.css'

const HEADLINE = [
  { lead: 'Your', accent: 'moments.', tone: 'teal' },
  { lead: 'Your', accent: 'story.', tone: 'purple' },
  { lead: 'Your', accent: 'page.', tone: 'gradient' },
]

/* Per-card placement (desktop), tilt, parallax depth and float timing. */
const CARD_LAYOUT = {
  birthday: { '--top': '17%', '--left': '3%', '--rot': '-7deg', '--depth': 26, '--float-dur': '7s', '--delay': '650ms' },
  wedding: { '--top': '13%', '--right': '3.5%', '--rot': '6deg', '--depth': 18, '--float-dur': '8.2s', '--delay': '780ms' },
  business: { '--bottom': '12%', '--left': '7%', '--rot': '5deg', '--depth': 14, '--float-dur': '7.6s', '--delay': '910ms' },
  story: { '--bottom': '15%', '--right': '6%', '--rot': '-5deg', '--depth': 30, '--float-dur': '6.6s', '--delay': '1040ms' },
}

export default function Hero() {
  const heroRef = useRef(null)
  usePointerParallax(heroRef)

  return (
    <section id="top" ref={heroRef} className="hero" aria-labelledby="hero-title">
      {/* Background depth: ambient light, concentric rings, cursor spotlight */}
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__glow hero__glow--teal" />
        <div className="hero__glow hero__glow--purple" />
        <div className="hero__rings">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="hero__ring" style={{ '--i': i }} />
          ))}
          <span className="hero__ring hero__ring--orbit" />
        </div>
        <div className="hero__spotlight" />
      </div>

      <div className="hero__content container">
        <p className="hero__eyebrow">
          <span className="hero__eyebrow-dot" aria-hidden="true" />
          Personal pages for life’s moments
        </p>

        <h1 id="hero-title" className="hero__title">
          {HEADLINE.map((line, lineIndex) => (
            <span key={line.accent} className="hero__line">
              <span className="hero__word" style={{ '--i': lineIndex * 2 }}>
                {line.lead}
              </span>{' '}
              <span className={`hero__word hero__word--${line.tone}`} style={{ '--i': lineIndex * 2 + 1 }}>
                {line.accent}
                {line.tone === 'gradient' && (
                  <svg className="hero__swoosh" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M4 17C70 6 160 4 296 12" pathLength="1" />
                  </svg>
                )}
              </span>
            </span>
          ))}
        </h1>

        <p className="hero__lede">
          Create a beautiful page for a birthday, a wedding, your business or your story — and share it with a
          single link.
        </p>

        <div className="hero__actions">
          <Button href={SIGNUP_HREF}>Create Your Page Free</Button>
          <Button href="#how" variant="ghost">
            See how it works
          </Button>
        </div>
      </div>

      <div className="hero__cards" aria-hidden="true">
        {MOMENTS.map((moment) => (
          <PageCard key={moment.id} moment={moment} style={CARD_LAYOUT[moment.id]} />
        ))}
      </div>
    </section>
  )
}
