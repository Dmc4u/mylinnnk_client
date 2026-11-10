# MyLinnnk visual editor: future improvements

Status: planned, not implemented. Recorded at the end of Phase 3 so later phases can build on the
existing editor architecture (`src/editor/`) rather than replace it.

## 1. Direct inline editing on the canvas

Edit headings and paragraphs by clicking and typing on the page itself.

- Keep the properties panel as the source of truth; inline editing calls the same `setContent()` operation
  with the same coalescing history keys, so undo/redo keeps working.
- Edit plain text only (no `contentEditable` HTML stored in drafts). Sanitise on commit, as `validatePage()` does today.
- Map rendered text back to its field with data attributes (e.g. `data-field="title"`) added by the
  section components, not by template-specific code.
- Keyboard and screen-reader access must remain available through the properties panel.

## 2. Image cropping and zoom

Let users frame photos instead of relying on the focus point (`center / top / bottom / left / right`).

- Store crop as data on the image object (e.g. `{ crop: { x, y, width, height }, zoom }`), never as a re-encoded copy,
  so the original upload stays intact and edits are reversible.
- Render with CSS (`object-position` / `object-view-box` or a scaled wrapper) so thumbnails, the canvas and
  published pages stay consistent.
- Add the new fields to the image schema and to `cleanImage()` validation before saving them.

## 3. Guest draft transfer to authenticated accounts

When a guest signs up or logs in, offer to move their local drafts into the account.

- Read drafts with `localDrafts.listDrafts()` / `loadDraft()`, then save them with `remoteDrafts.saveDraft()`.
- Upload each referenced image (`collectMediaIds(page)`) through `remoteMedia.upload()`, then rewrite the
  page's `mediaId`s to the server's media IDs before saving.
- The server validates every transferred page (same schema rules as `validatePage()`), assigns ownership and
  new server IDs, and never trusts client timestamps or status.
- Keep the local copy until the server confirms success; then let the user choose to remove it.
- Make the transfer idempotent (client-generated draft IDs as idempotency keys) so retries don't duplicate pages.

## 4. Secure cloud draft and media storage

Replace the `remoteDrafts` and `remoteMedia` stubs with real, authenticated services.

- Pages: MongoDB documents in the existing page shape (`theme`, ordered `sections`, `schemaVersion`) plus
  `ownerId`, `status`, timestamps and revision numbers for conflict detection.
- Every request checks authentication and page ownership; validation runs server-side on every save.
- Media: upload via short-lived signed URLs to object storage; validate type, size and dimensions on the server;
  strip metadata (EXIF location); serve through a CDN.
- Limits per user (draft count, storage quota) enforced by the server.

## 5. Payment-verified publishing

Implement the flow described in [`publishing-lifecycle.md`](./publishing-lifecycle.md).

- Server-side plans and prices; the client only displays them.
- Checkout sessions created by the server; publication only after a signature-verified provider webhook is
  recorded idempotently and a `PublishingEntitlement` exists.
- A checkout redirect alone never publishes a page.
- Renewals, cancellations, failures, expiry and chargebacks move pages between lifecycle states without deleting content.
- Plans: one-time `event-pass` for personal event pages; `pro-pass` (one-time), `pro-monthly` and `pro-annual`
  for professional pages (`src/editor/config/plans.js`). One-time passes never auto-renew; subscriptions renew
  until cancelled.
- Add owner-facing "Renew" and "Change plan" actions that switch entitlements without touching page content.
- Replace the disabled "Continue to payment" button in `PublishDialog` once this exists.
