import { Link } from 'react-router'
import LegalPage from '../InfoPages/LegalPage.jsx'
import { contactSection } from '../InfoPages/legalSections.jsx'
import { SUPPORT_EMAIL } from '../../utils/contact.js'

/**
 * /privacy-policy: written from what MyLinnnk actually does (see the API and client code). Points still to be
 * decided are tracked in mylinnnk_api/DEPLOYMENT.md (§17, legal pre-launch checklist), not on the page.
 */
const SECTIONS = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          MyLinnnk is a service for creating and publishing personal and professional web pages. It is operated by DMC LIMITED (“we”, “us”). For any
          privacy question or request, write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <h3>Your account</h3>
        <ul>
          <li>Your name and email address.</li>
          <li>Your password, which we never store in readable form: only a secure one-way hash (Argon2id).</li>
          <li>Email verification codes, stored only as a keyed hash and valid for 10 minutes.</li>
        </ul>
        <h3>Signing in</h3>
        <ul>
          <li>A session cookie that keeps you signed in. We store only a hash of its value, when it expires, and a short description of your browser (its “user agent”) so you can recognise sessions.</li>
        </ul>
        <h3>Your pages and images</h3>
        <ul>
          <li>Drafts you save to your account: their text, design choices and the images you add.</li>
          <li>Images are re-encoded when you upload them, which removes embedded information such as camera details and location.</li>
          <li>Drafts you make without an account stay in your own browser on your device; we don’t receive them unless you save them to an account.</li>
        </ul>
        <h3>Published pages</h3>
        <ul>
          <li>When you publish a page, a copy of it is shown publicly at its web address (for example mylinnnk.com/p/your-name). Anyone with the link can see it while it is live.</li>
          <li>When a live page’s link is shared, apps such as WhatsApp, Facebook or X show a preview using the page’s title, a short description from its text and its main image. Pages that aren’t live show no personal preview.</li>
        </ul>
        <h3>Payments</h3>
        <ul>
          <li>For each payment order: the plan, amount, order reference, the country you tell us you live in, and the expiry of the order.</li>
          <li>What you tell us when you report a payment: the name on the paying account, the transfer date and an optional note.</li>
          <li>Receipt images you upload as proof of transfer. They are stored privately, re-encoded without metadata, and seen only by you and our payment reviewers.</li>
          <li>When we confirm a payment, our reviewer records the amount and date credited and the bank’s transaction reference.</li>
          <li>Payments are made by bank transfer from your own bank. We never receive your card details or your online-banking credentials.</li>
        </ul>
        <h3>Messages you send us</h3>
        <ul>
          <li>Contact messages and quote requests: your name, email and what you write, plus phone, country and project details for quotes.</li>
          <li>They are stored securely in MyLinnnk with a reference number, seen only by our team, and also emailed to our support inbox so we can reply.</li>
        </ul>
        <h3>Security records</h3>
        <ul>
          <li>A record of important actions, such as sign-ins to administration, payment decisions and publishing changes, kept to protect accounts and payments.</li>
          <li>Technical server logs (the address requested, the result and timing) used to keep the service running. Email addresses in logs are masked.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use-it',
    title: 'How we use it',
    body: (
      <ul>
        <li>To run your account, keep you signed in and protect it (for example verifying your email and resetting your password).</li>
        <li>To save, show and publish your pages.</li>
        <li>To create payment orders, check transfers against our bank account, and publish or renew your page once a payment is confirmed.</li>
        <li>To send you service emails: verification codes, password resets, confirmation that your page is live, and other messages about your account, payments or pages.</li>
        <li>To answer your messages and quote requests.</li>
        <li>To prevent abuse and keep the service secure.</li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    body: (
      <>
        <p>We don’t sell your information, show advertising or use analytics or tracking services. We share information only with services that help us run MyLinnnk:</p>
        <ul>
          <li>Our hosting and storage providers, which store the database, images and receipts.</li>
          <li>Our email provider, which delivers the emails we send and the messages you send us.</li>
        </ul>
        <p>We may also share information when the law requires it, or to protect the rights and safety of our users and the service.</p>
        <p>These providers may store or process information outside the country where you live, including in the United States.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and storage on your device',
    body: (
      <p>
        MyLinnnk uses one essential cookie to keep you signed in, and stores drafts and images you make as a guest in your own browser. We don’t use
        advertising or analytics cookies. See <Link to="/cookie-settings">Cookie settings</Link> for the full list.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <>
        <ul>
          <li>Sessions: until you sign out, or 30 days.</li>
          <li>Email verification codes: 10 minutes. Password reset links: 60 minutes.</li>
          <li>Drafts you delete: removed permanently 30 days after deletion.</li>
          <li>Images no draft uses any more: removed after 30 days.</li>
          <li>Technical server logs: 14 days.</li>
          <li>Your account, drafts and published pages: while your account exists.</li>
          <li>Payment orders, receipts and payment decisions: kept as financial records.</li>
          <li>Contact messages and quote requests: kept so we can follow up on them. You can ask us to delete yours.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'security',
    title: 'How we protect it',
    body: (
      <ul>
        <li>Encrypted connections (HTTPS) between your browser and MyLinnnk.</li>
        <li>Passwords and sign-in tokens stored only as hashes; the session cookie can’t be read by page scripts.</li>
        <li>Receipts and unpublished drafts stored privately; only you and, for receipts, our payment reviewers can open them.</li>
        <li>Administration limited to a designated, verified account, with sign-ins and decisions recorded.</li>
      </ul>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your choices and rights',
    body: (
      <>
        <p>You can view and change your drafts at any time, and delete drafts from your account. You can also ask us to:</p>
        <ul>
          <li>give you a copy of the information we hold about you;</li>
          <li>correct information that is wrong;</li>
          <li>delete your account and its information (we may need to keep payment records where the law requires);</li>
          <li>stop or limit how we use your information.</li>
        </ul>
        <p>
          Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the email address on your account. You can also complain to your data
          protection authority.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <>
        <p>MyLinnnk is not intended for children. Please don’t create an account if you are under the minimum age for using online services in your country.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>If we change how we handle your information, we’ll update this page and the date above. For significant changes we’ll let account holders know by email.</p>,
  },
  contactSection('this policy or your information'),
]

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      pageTitle="Privacy policy"
      eyebrow="Privacy policy"
      lines={['Your pages, your information.', 'Here’s how we look after it.']}
      lead="What we collect when you use MyLinnnk, why, how long we keep it, and the choices you have. No advertising, no analytics, no selling of data."
      updated="15 November 2026"
      sections={SECTIONS}
    />
  )
}
