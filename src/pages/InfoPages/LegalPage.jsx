import Reveal from '../../components/Reveal/Reveal.jsx'
import { COMPANY } from '../../config/company.js'
import { SUPPORT_EMAIL } from '../../utils/contact.js'
import { InfoHero, ScrollProgress, SupportEmail } from './InfoPageParts.jsx'

/**
 * Who operates MyLinnnk, shown at the top of both legal pages. Only confirmed facts are stated (config/
 * company.js); open legal points are tracked in mylinnnk_api/DEPLOYMENT.md (§17), never shown on the page.
 */
export function OperatorNotice() {
  return (
    <>
      <p>
        <strong>MyLinnnk is a service of {COMPANY.name}</strong> (company registration number {COMPANY.registrationNumber}). In these pages,
        “MyLinnnk”, “we” and “us” mean {COMPANY.name}.
      </p>
      <p>
        Questions about this page: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </>
  )
}


/**
 * Layout for the legal pages only (/privacy-policy, /terms-of-service): hero, who operates MyLinnnk,
 * a sticky table of contents and numbered sections. sections: [{ id, title, body }] (body is JSX).
 * (The numbers are visual: links and headings keep their plain titles as accessible names.)
 */
export default function LegalPage({ pageTitle, eyebrow, lines, lead, updated, sections, notice = <OperatorNotice /> }) {
  return (
    <div className="info-page">
      <title>{`${pageTitle} · MyLinnnk`}</title>
      <ScrollProgress />
      <InfoHero eyebrow={eyebrow} lines={lines} lead={lead} aside={<SupportEmail note="Questions about this page? Write to us and we’ll explain." />} />
      <div className="legal container">
        <nav className="legal__toc" aria-label="On this page">
          <p>On this page</p>
          {sections.map((s, i) => (
            <a key={s.id} href={`#${s.id}`}>
              <span className="legal__num" aria-hidden="true">
                {i + 1}.
              </span>{' '}
              {s.title}
            </a>
          ))}
        </nav>
        <div className="legal__body">
          <p className="legal__updated">Last updated: {updated}</p>
          {notice && (
            <aside className="legal__notice" aria-label="Who operates MyLinnnk">
              {notice}
            </aside>
          )}
          {sections.map((s, i) => (
            <Reveal as="section" key={s.id} id={s.id} aria-labelledby={`${s.id}-title`}>
              <h2 id={`${s.id}-title`}>
                <span className="legal__num" aria-hidden="true">
                  {i + 1}.
                </span>{' '}
                {s.title}
              </h2>
              {s.body}
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  )
}
