import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import Reveal from '../../components/Reveal/Reveal.jsx'
import MagneticButton from '../../components/UI/MagneticButton.jsx'
import { FormAlert, SelectField, SubmitButton, TextAreaField, TextField } from '../../components/Form/Form.jsx'
import { errorMessage } from '../../auth/messages.js'
import { useAuth } from '../../auth/useAuth.js'
import { useAuthForm } from '../../auth/useAuthForm.js'
import { validateDisplayName, validateEmail } from '../../auth/validation.js'
import { optionList } from '../../config/enquiryOptions.js'
import { enquiryApi } from '../../services/enquiryApi.js'
import { QUOTE_PATH } from '../../utils/contact.js'
import { EnquirySent, InfoHero, ScrollProgress, SpamTrap, SupportEmail } from '../InfoPages/InfoPageParts.jsx'

const MESSAGE_MAX = 4000

const validate = (v) => ({
  name: () => (String(v.name).trim().length < 2 ? 'Enter your name.' : validateDisplayName(v.name.slice(0, 60))),
  email: () => validateEmail(v.email),
  category: () => (v.category ? null : 'Choose a topic.'),
  subject: () => (v.subject.trim().length < 3 ? 'Add a short subject.' : null),
  message: () => (v.message.trim().length < 10 ? 'Write a little more (at least 10 characters).' : null),
})

/** Common questions, each with where to start. */
const TOPICS = [
  { title: 'Payments & publishing', text: 'Questions about a transfer, your order reference or when your page goes live.' },
  { title: 'Your account', text: 'Signing in, verifying your email, or managing your saved pages.' },
  { title: 'Something not working?', text: 'Tell us what you were doing and what you saw. Screenshots help; mention them and we’ll ask.' },
]

/**
 * /contact: a contact form (sent to the support inbox by the API, POST /enquiries), the support
 * address, and where to go for quotes.
 */
export default function ContactPage() {
  const { user } = useAuth()
  const [startedAt, setStartedAt] = useState(() => Date.now()) // when the form opened (spam check)
  const [sent, setSent] = useState(null)
  // ?topic=payments&ref=MLK-… (from the dashboard): a known topic and a reference that looks like ours only.
  const [params] = useSearchParams()
  const [initial] = useState(() => {
    const topic = params.get('topic') ?? ''
    const ref = params.get('ref') ?? ''
    const safeRef = /^(MLK-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}|\/p\/[a-z0-9-]{1,60})$/.test(ref) ? ref : ''
    return {
      name: user?.displayName ?? '',
      email: user?.email ?? '',
      category: optionList('contactCategories').some(([v]) => v === topic) ? topic : '',
      subject: safeRef ? `About ${safeRef}` : '',
      message: '',
      website: '',
    }
  })
  const { formRef, values, setField, errors, showFieldErrors, formError, setFormError, submitting, handleSubmit } = useAuthForm(initial, validate)

  const onSubmit = handleSubmit(async (v) => {
    try {
      const data = await enquiryApi.send({
        type: 'contact',
        name: v.name.trim(),
        email: v.email.trim(),
        category: v.category,
        subject: v.subject.trim(),
        message: v.message.trim(),
        website: v.website,
        startedAt,
      })
      setSent({ reference: data.reference })
    } catch (error) {
      if (error.code === 'VALIDATION_FAILED') {
        showFieldErrors(Object.fromEntries((error.details ?? []).map((d) => [String(d.path).split('.')[0], 'Please check this field.'])))
      }
      setFormError(errorMessage(error))
    }
  })

  const another = () => {
    setStartedAt(Date.now())
    setField('subject', '')
    setField('message', '')
    setSent(null)
  }

  return (
    <div className="info-page">
      <title>Contact us · MyLinnnk</title>
      <ScrollProgress />
      <InfoHero
        eyebrow="Help · Questions · Feedback"
        lines={['We’re here to help.', 'Send us a message.']}
        lead="Questions about your page, your account or a payment? Write to us and a real person will get back to you by email."
        aside={<SupportEmail note="We reply by email, usually within one to two working days. Include your order reference (MLK-…) for payment questions." />}
      >
        <MagneticButton href="#contact-form">Write a message</MagneticButton>
        <MagneticButton to={QUOTE_PATH} variant="secondary">
          Request a quote
        </MagneticButton>
      </InfoHero>

      <div className="container">
        <Reveal className="info-tiles" as="div">
          {TOPICS.map((t) => (
            <section key={t.title} className="info-tile">
              <h3>{t.title}</h3>
              <p>{t.text}</p>
            </section>
          ))}
        </Reveal>
      </div>

      <div className="info-body container">
        <Reveal className="info-intro">
          <h2 className="info-intro__title">Tell us what you need.</h2>
          <p className="info-intro__text">
            Choose a topic so your message reaches the right place. For custom designs or bigger projects, <Link to={QUOTE_PATH}>request a quote</Link>{' '}
            instead: it asks the questions we need to price your page.
          </p>
        </Reveal>

        <Reveal className="info-card" delay={120}>
          <div id="contact-form" tabIndex={-1} />
          {sent ? (
            <EnquirySent title="Thanks! Your message has been sent." reference={sent.reference} onAnother={another} anotherLabel="Send another message">
              <p>We’ll reply to {values.email.trim()} by email. Check your spam folder if you haven’t heard from us in two working days.</p>
            </EnquirySent>
          ) : (
            <form ref={formRef} className="info-form" onSubmit={onSubmit} noValidate aria-label="Contact MyLinnnk">
              <FormAlert>{formError}</FormAlert>
              <div className="info-form__row">
                <TextField label="Your name" name="name" autoComplete="name" value={values.name} onChange={setField} error={errors.name} maxLength={100} />
                <TextField label="Email" name="email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={setField} error={errors.email} maxLength={254} />
              </div>
              <SelectField label="Topic" name="category" value={values.category} onChange={setField} error={errors.category} options={optionList('contactCategories')} placeholder="Choose a topic" />
              <TextField label="Subject" name="subject" value={values.subject} onChange={setField} error={errors.subject} maxLength={120} />
              <TextAreaField label="Message" name="message" value={values.message} onChange={setField} error={errors.message} maxLength={MESSAGE_MAX} hint="Include any order reference or page address that helps us find what you mean." />
              <SpamTrap value={values.website} onChange={setField} />
              <p className="info-form__privacy">
                We use these details only to answer you. See our <Link to="/privacy-policy">Privacy policy</Link>.
              </p>
              <SubmitButton busy={submitting} busyLabel="Sending…">
                Send message
              </SubmitButton>
            </form>
          )}
        </Reveal>
      </div>
    </div>
  )
}
