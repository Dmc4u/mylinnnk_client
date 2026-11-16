import { Link } from 'react-router'
import LegalPage from '../InfoPages/LegalPage.jsx'
import { contactSection } from '../InfoPages/legalSections.jsx'
import { SUPPORT_EMAIL } from '../../utils/contact.js'

/**
 * /terms-of-service: written from how MyLinnnk actually works (plans, manual bank-transfer
 * verification, expiry, suspension). Points still to be decided are tracked in mylinnnk_api/DEPLOYMENT.md
 * (§17, legal pre-launch checklist), not on the page.
 */
const SECTIONS = [
  {
    id: 'about',
    title: 'About these terms',
    body: (
      <>
        <p>
          These terms apply when you use MyLinnnk, a service operated by DMC LIMITED for creating and publishing web pages. By creating an account,
          publishing a page or paying for a plan, you agree to them. If you don’t agree, please don’t use the service.
        </p>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Your account',
    body: (
      <ul>
        <li>Give accurate details, including an email address you can access; some features need a verified email.</li>
        <li>Keep your password private. You’re responsible for what happens in your account.</li>
        <li>Tell us straight away at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you think someone else has used it.</li>
      </ul>
    ),
  },
  {
    id: 'content',
    title: 'Your content and acceptable use',
    body: (
      <>
        <p>
          You own the words, photos and other content you put on your pages. You give us permission to store, process and display that content so we
          can provide the service, including showing published pages to anyone who visits them.
        </p>
        <p>Only use content you have the right to use, and don’t use MyLinnnk to publish anything that:</p>
        <ul>
          <li>is unlawful, fraudulent or deceptive, including impersonating someone or collecting payments or passwords under false pretences;</li>
          <li>harasses, threatens or exposes private information about other people;</li>
          <li>is hateful, sexually explicit, or exploits or endangers children;</li>
          <li>infringes someone else’s copyright, trademark or other rights;</li>
          <li>contains malware or tries to interfere with MyLinnnk or other people’s pages.</li>
        </ul>
        <p>We may remove content or take a page offline if it breaks these rules or the law.</p>
      </>
    ),
  },
  {
    id: 'publishing',
    title: 'Publishing and plans',
    body: (
      <>
        <p>Creating and editing pages is free. Publishing a page at its public address requires a publishing plan for that page:</p>
        <ul>
          <li>Celebration: live for 30 days, one payment, with a small “Created with MyLinnnk” credit on the page.</li>
          <li>Professional Starter: live for 90 days, one payment, no MyLinnnk branding.</li>
          <li>Professional Monthly: live for 30 days per payment, no MyLinnnk branding.</li>
          <li>Professional Annual: live for 365 days per payment, no MyLinnnk branding.</li>
        </ul>
        <p>
          Current prices are shown on the <Link to="/pricing">pricing page</Link> and when you choose a plan. Prices are per published page, and nothing
          renews or charges automatically. The plan, price and features at the time you pay are the ones that apply to that payment.
          Prices are payable in naira (NGN). Any amount shown in US dollars is an estimate for information only, based on a dated reference
          exchange rate; the amount you pay is always the NGN price shown before you pay.
        </p>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Payments and verification',
    body: (
      <>
        <ul>
          <li>Payment is by bank transfer to the DMC LIMITED account shown with your order. Bank-transfer payment is available in selected countries.</li>
          <li>Transfer the exact amount and include your order reference, then upload your transfer receipt and tell us you’ve paid.</li>
          <li>A receipt is evidence only. We check that the money has actually arrived in our account before publishing or renewing your page.</li>
          <li>Each order has a payment deadline, shown on the order with a countdown. If you haven’t told us you’ve paid by then, the order expires and you can start a new one. Once you’ve told us you’ve paid, the order doesn’t expire: we check it.</li>
          <li>If we can’t match a payment, we’ll tell you why so you can send the correct details.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'renewals',
    title: 'Renewals and expiry',
    body: (
      <ul>
        <li>You can renew a page while it is live or after it has ended. While it is live (or in the day after it ends), a renewal adds time from its current end date; after that, the new period starts when we confirm your payment.</li>
        <li>When a plan ends, the page goes offline at its address. Your draft stays in your account, and you can publish it again.</li>
        <li>Your page’s end date is shown in your dashboard. Please keep track of it: any reminder we send is a courtesy, not a guarantee.</li>
        <li>We don’t charge you automatically; renewing is always your choice.</li>
      </ul>
    ),
  },
  {
    id: 'refunds',
    title: 'Cancellations and refunds',
    body: (
      <>
        <p>
          You can cancel an order until you tell us you’ve paid, and again if we couldn’t match your payment. If you think you’ve paid in error, or something went wrong with your page,
          contact us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your order reference and we’ll look into it.
        </p>
      </>
    ),
  },
  {
    id: 'suspension',
    title: 'Suspension and closing accounts',
    body: (
      <>
        <p>
          We may suspend a page or an account if it breaks these terms, if we’re required to by law, or to protect our users or the service. Where
          appropriate we’ll tell you why and how to resolve it. You can ask us to close your account at any time.
        </p>
      </>
    ),
  },
  {
    id: 'ip',
    title: 'Our templates and software',
    body: (
      <p>
        MyLinnnk’s software, design system and templates belong to DMC LIMITED or its licensors. You may use the templates to create pages on MyLinnnk,
        but not copy them for use elsewhere. Sample photos in templates are provided under their own free licences.
      </p>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and changes',
    body: (
      <>
        <p>
          We work to keep MyLinnnk available and your pages online, but we can’t promise the service will be uninterrupted or error-free. We may improve
          or change features over time; if a change significantly affects a plan you’ve paid for, we’ll tell you.
        </p>
        <p>Please keep your own copies of important photos and text.</p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Questions and disputes',
    body: (
      <>
        <p>If you have a problem, please contact us first; most issues can be resolved quickly.</p>
        <p>Nothing in these terms takes away rights you have under the law that applies to you and that can’t be excluded.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: <p>We may update these terms. We’ll change the date above and, for significant changes, let account holders know by email before they take effect.</p>,
  },
  contactSection('these terms, your account or a payment'),
]

export default function TermsPage() {
  return (
    <LegalPage
      pageTitle="Terms of service"
      eyebrow="Terms of service"
      lines={['Clear terms for your pages.', 'No surprises.']}
      lead="How accounts, publishing plans, bank-transfer payments, renewals and content rules work on MyLinnnk."
      updated="15 November 2026"
      sections={SECTIONS}
    />
  )
}
