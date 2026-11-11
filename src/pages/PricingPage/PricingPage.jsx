import { useSearchParams } from 'react-router'
import Pricing from '../../components/Pricing/Pricing.jsx'
import { Check } from '../../components/Pricing/PlanCard.jsx'
import { PLAN_IDS, PUBLISHING_GUARANTEES } from '../../editor/config/plans.js'
import './PricingPage.css'

const FACTS = [
  'Creating, editing and saving pages is always free.',
  'Prices are per published page, in naira.',
  'Nothing renews or charges automatically.',
  ...PUBLISHING_GUARANTEES,
]

/**
 * /pricing[?plan=<id>]: compare the publishing plans and pick one. The choice
 * is kept in the address (shareable, survives a reload) but nothing is bought:
 * paid publishing is not available yet.
 */
export default function PricingPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('plan')
  const selected = PLAN_IDS.includes(requested) ? requested : null

  const select = (id) => {
    const next = new URLSearchParams(params)
    next.set('plan', id)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <div className="pricing-page">
      <header className="pricing-hero container">
        <p className="pricing-hero__eyebrow">Pricing</p>
        <h1 className="pricing-hero__title">
          Free to create. <span className="text-gradient">Simple to publish.</span>
        </h1>
        <p className="pricing-hero__intro">
          Build your page for free. When you’re ready to share it, choose a publishing plan for that page: one payment, a
          clear validity period and no automatic charges.
        </p>
      </header>

      <section className="pricing-page__plans container" aria-labelledby="pricing-plans-title">
        <h2 id="pricing-plans-title" className="sr-only">
          Publishing plans
        </h2>
        <Pricing selected={selected} onSelect={select} />
      </section>

      <section className="pricing-facts container" aria-labelledby="pricing-facts-title">
        <h2 id="pricing-facts-title" className="pricing-facts__title">
          Good to know
        </h2>
        <ul className="pricing-facts__list">
          {FACTS.map((fact) => (
            <li key={fact}>
              <Check /> {fact}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
