import './DraftListSkeleton.css'

export default function DraftListSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      <span className="sr-only">Loading your drafts…</span>
      <ul className="draft-list-skeleton" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <li className="draft-list-skeleton__item" key={row}>
            <div className="draft-list-skeleton__text">
              <span className="draft-list-skeleton__title" />
              <span className="draft-list-skeleton__meta" />
            </div>
            <span className="draft-list-skeleton__action" />
          </li>
        ))}
      </ul>
    </div>
  )
}
