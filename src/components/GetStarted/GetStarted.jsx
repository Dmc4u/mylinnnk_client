import Reveal from '../Reveal/Reveal.jsx'
import Button from '../Button/Button.jsx'
import BrandMark from '../Brand/BrandMark.jsx'
import { CREATE_PAGE_HREF } from '../../utils/navigation.js'
import './GetStarted.css'

export default function GetStarted() {
  return (
    <section id="get-started" className="section get-started" aria-labelledby="get-started-title">
      <div className="container">
        <Reveal className="get-started__panel">
          <div className="get-started__rings" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <BrandMark size={56} variant="dark" className="get-started__mark" />
          <h2 id="get-started-title" className="get-started__title">
            Ready to tell your story?
          </h2>
          <p className="get-started__text">Your moments deserve a page of their own.</p>
          <Button to={CREATE_PAGE_HREF} className="get-started__cta">
            Create Your Page Free
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
