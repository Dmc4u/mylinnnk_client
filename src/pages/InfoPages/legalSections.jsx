import { COMPANY } from '../../config/company.js'
import { SUPPORT_EMAIL } from '../../utils/contact.js'

/** The closing "Contact us" section shared by both legal pages (`topic`: "this policy", "these terms"). */
export const contactSection = (topic) => ({
  id: 'contact',
  title: 'Contact us',
  body: (
    <>
      <p>For any question about {topic}, or to make a request, write to us, from the email address on your account if you have one.</p>
      <address className="legal__company">
        <strong>{COMPANY.name}</strong> (operator of MyLinnnk)
        <br />
        Company registration number: {COMPANY.registrationNumber}
        <br />
        Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </address>
    </>
  ),
})
