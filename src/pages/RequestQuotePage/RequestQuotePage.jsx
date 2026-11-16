import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import Reveal from '../../components/Reveal/Reveal.jsx'
import MagneticButton from '../../components/UI/MagneticButton.jsx'
import { FormAlert, SelectField, SubmitButton, TextAreaField, TextField } from '../../components/Form/Form.jsx'
import { errorMessage } from '../../auth/messages.js'
import { useAuthForm } from '../../auth/useAuthForm.js'
import { validateDisplayName, validateEmail } from '../../auth/validation.js'
import { useAuth } from '../../auth/useAuth.js'
import { countryOptions } from '../../config/countries.js'
import { optionList } from '../../config/enquiryOptions.js'
import { enquiryApi } from '../../services/enquiryApi.js'
import { CONTACT_PATH } from '../../utils/contact.js'
import { EnquirySent, InfoHero, ScrollProgress, SpamTrap, SupportEmail } from '../InfoPages/InfoPageParts.jsx'

const DESCRIPTION_MAX = 4000
const PLAN_PATTERN = /^[a-z][a-z0-9-]{1,39}$/
const PAGE_PATTERN = /^[A-Za-z0-9./:-]{1,120}$/

const validate = (v) => ({
  name: () => (String(v.name).trim().length < 2 ? 'Enter your full name.' : validateDisplayName(v.name.slice(0, 60))),
  email: () => validateEmail(v.email),
  phone: () => (v.phone.trim() && !/^\+?[0-9 ()-]{6,24}$/.test(v.phone.trim()) ? 'Enter a phone number with digits only (you can start with +).' : null),
  country: () => (v.country ? null : 'Choose your country.'),
  occasion: () => (v.occasion ? null : 'Choose what the page is for.'),
  service: () => (v.service ? null : 'Choose the service you need.'),
  description: () => (v.description.trim().length < 20 ? 'Tell us a little more (at least 20 characters).' : null),
})

/**
 * /request-quote[?plan=&page=&country=]: ask for a quote. Plan, page address and country carried in
 * the address (from a plan, the payment dialog or a pricing card) are shown and sent along.
 * Sent to the support inbox by the API (POST /enquiries).
 */
export default function RequestQuotePage() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const countries = useMemo(() => countryOptions().map((c) => [c.code, c.name]), [])
  const knownCountry = (code) => (countries.some(([c]) => c === code) ? code : '')
  const context = useMemo(() => {
    const plan = params.get('plan') ?? ''
    const page = params.get('page') ?? ''
    return { plan: PLAN_PATTERN.test(plan) ? plan : '', page: PAGE_PATTERN.test(page) ? page : '' }
  }, [params])
  const initial = useMemo(
    () => ({
      name: user?.displayName ?? '',
      email: user?.email ?? '',
      phone: '',
      country: knownCountry((params.get('country') ?? '').toUpperCase()),
      occasion: '',
      service: context.plan === 'special-request' ? 'custom-design' : '',
      description: '',
      budget: '',
      timeline: '',
      website: '',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once, when the page opens
    [],
  )
  const [startedAt] = useState(() => Date.now()) // when the form opened (spam check)
  const [sent, setSent] = useState(null)
  const { formRef, values, setField, errors, showFieldErrors, formError, setFormError, submitting, handleSubmit } = useAuthForm(initial, validate)

  const onSubmit = handleSubmit(async (v) => {
    try {
      const data = await enquiryApi.send({
        type: 'quote',
        name: v.name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim(),
        country: v.country,
        occasion: v.occasion,
        service: v.service,
        description: v.description.trim(),
        budget: v.budget,
        timeline: v.timeline,
        ...(context.plan || context.page ? { context } : {}),
        website: v.website,
        startedAt,
      })
      setSent({ reference: data.reference })
    } catch (error) {
      if (error.code === 'VALIDATION_FAILED') {
        const fields = Object.fromEntries((error.details ?? []).map((d) => [String(d.path).split('.')[0], 'Please check this field.']))
        showFieldErrors(fields)
      }
      setFormError(errorMessage(error))
    }
  })

  const contextChips = [context.plan && `Plan: ${context.plan.replace(/-/g, ' ')}`, context.page && `Page: ${context.page}`].filter(Boolean)

  return (
    <div className="info-page">
      <title>Request a quote · MyLinnnk</title>
      <ScrollProgress />
      <InfoHero
        eyebrow="Custom pages · Design help · Bigger projects"
        lines={['Tell us about your moment.', 'We’ll shape the right page.']}
        lead="Something bespoke, a few extra touches, or a page that doesn’t fit a standard plan? Share a short description and we’ll reply with a clear quote and next steps."
        aside={<SupportEmail note="A short description is enough to begin. We agree on scope, price and timing with you before any work starts." />}
      >
        <MagneticButton href="#quote-form">Start your request</MagneticButton>
        <MagneticButton to={CONTACT_PATH} variant="secondary">
          Just have a question?
        </MagneticButton>
      </InfoHero>

      <div className="info-body container">
        <Reveal className="info-intro">
          <h2 className="info-intro__title">You don’t need a finished brief.</h2>
          <p className="info-intro__text">Tell us who the page is for and what you’d like it to do. We’ll help with the rest.</p>
          <ol className="info-steps">
            <li>
              <strong>Share the idea</strong>A few sentences about the occasion, the people and what matters to you.
            </li>
            <li>
              <strong>Get a clear quote</strong>We reply by email with what’s included, the price and how long it takes.
            </li>
            <li>
              <strong>Approve and relax</strong>Nothing starts and nothing is charged until you say yes.
            </li>
          </ol>
        </Reveal>

        <Reveal className="info-card" delay={120}>
          <div id="quote-form" tabIndex={-1} />
          {sent ? (
            <EnquirySent title="Thank you! Your request is on its way." reference={sent.reference}>
              <p>We usually reply within one to two working days by email. Keep your reference handy if you write to us about it.</p>
            </EnquirySent>
          ) : (
            <form ref={formRef} className="info-form" onSubmit={onSubmit} noValidate aria-label="Request a quote">
              {contextChips.length > 0 && (
                <ul className="info-context" aria-label="What this request is about">
                  {contextChips.map((chip) => (
                    <li key={chip}>{chip}</li>
                  ))}
                </ul>
              )}
              <FormAlert>{formError}</FormAlert>
              <p className="info-form__legend">About you</p>
              <div className="info-form__row">
                <TextField label="Full name" name="name" autoComplete="name" value={values.name} onChange={setField} error={errors.name} maxLength={100} />
                <TextField label="Email" name="email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={setField} error={errors.email} maxLength={254} />
              </div>
              <div className="info-form__row">
                <TextField label="Phone (optional)" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={setField} error={errors.phone} maxLength={24} required={false} />
                <SelectField label="Country" name="country" value={values.country} onChange={setField} error={errors.country} options={countries} placeholder="Choose your country" autoComplete="country" />
              </div>
              <p className="info-form__legend">Your page</p>
              <div className="info-form__row">
                <SelectField label="What is the page for?" name="occasion" value={values.occasion} onChange={setField} error={errors.occasion} options={optionList('occasions')} />
                <SelectField label="Service you need" name="service" value={values.service} onChange={setField} error={errors.service} options={optionList('services')} />
              </div>
              <TextAreaField
                label="Describe your project"
                name="description"
                value={values.description}
                onChange={setField}
                error={errors.description}
                maxLength={DESCRIPTION_MAX}
                hint="Who it’s for, what you’d like to include, and anything you already have (photos, wording, a date)."
              />
              <div className="info-form__row">
                <SelectField label="Budget (optional)" name="budget" value={values.budget} onChange={setField} options={optionList('budgets')} placeholder="Choose a range" required={false} />
                <SelectField label="Timeline (optional)" name="timeline" value={values.timeline} onChange={setField} options={optionList('timelines')} placeholder="When do you need it?" required={false} />
              </div>
              <SpamTrap value={values.website} onChange={setField} />
              <p className="info-form__privacy">
                We use these details only to reply to your request. See our <Link to="/privacy-policy">Privacy policy</Link>. Have files to share? Mention them
                here and we’ll tell you how to send them when we reply.
              </p>
              <SubmitButton busy={submitting} busyLabel="Sending your request…">
                Send request
              </SubmitButton>
            </form>
          )}
        </Reveal>
      </div>
    </div>
  )
}
