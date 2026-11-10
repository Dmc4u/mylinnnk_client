# MyLinnnk publishing lifecycle (draft for backend design)

Status: proposal written during Phase 3 (visual editor). Nothing here is implemented on a server yet.
The frontend already uses these state names (`src/editor/config/plans.js → PAGE_STATES`).

## Principles

- **Creating is free, publishing is paid.** Guests and registered users can build and edit pages without paying.
- **The server decides.** Plan eligibility, prices, payment status and entitlements are determined server-side.
  The browser's category, amounts or "paid" flags are never trusted.
- **Ownership is separate from visibility.** A page belongs to a user whether or not it is publicly visible.
- **Content is never deleted by billing events.** Expiry or cancellation hides a page; it does not remove it.

## Page states

| State | Meaning | Public? |
|---|---|---|
| `draft` | Being edited. Never published, or changes not yet published. | No |
| `pending_payment` | Owner started checkout; awaiting a verified payment webhook. | No |
| `published` | Live at its public address under a valid entitlement. | Yes |
| `expired` | Entitlement period ended (event pass elapsed, or subscription lapsed). | No |
| `unpublished` | Owner took the page offline voluntarily. | No |
| `suspended` | Taken offline by MyLinnnk (policy, abuse, chargeback). | No |

### Transitions

```
draft ──(owner requests publish)──▶ pending_payment
pending_payment ──(verified webhook: payment succeeded)──▶ published
pending_payment ──(payment failed / abandoned / expired session)──▶ draft
published ──(entitlement period ends / subscription not renewed)──▶ expired
published ──(owner unpublishes)──▶ unpublished
unpublished ──(owner republishes, entitlement still valid)──▶ published
expired ──(owner renews / pays again, verified webhook)──▶ published
any ──(moderation)──▶ suspended ──(moderation resolved)──▶ previous state
```

- If an owner already holds a valid entitlement for the page, publishing goes straight to `published`
  (no `pending_payment`).
- Editing a published page creates unpublished changes; pushing them live does **not** require another payment
  while the entitlement is valid, unless a future plan says otherwise.

## Plans (configuration, not code)

Plan identifiers live in `src/editor/config/plans.js` for the UI; the backend owns the real `PublishingPlans`
collection (prices, currency, period length, renewal rules).

- `event-pass`: one-time payment, fixed publication period (length to be defined).
- `pro-monthly` / `pro-annual`: subscription; page stays live while the subscription is active.

The template category only provides a **suggested** plan family. The server applies the actual rules.

## Backend responsibilities (future phases)

1. Authenticate the user.
2. Validate page ownership for every draft, media and publish operation.
3. Determine applicable publishing plans for the page.
4. Create a checkout session with the payment provider (server-side amounts only).
5. Receive payment provider webhooks and verify their signatures.
6. Record the payment transaction idempotently (keyed by provider event/payment ID).
7. Create or extend the `PublishingEntitlement`.
8. Publish the page only after a verified, recorded payment. A checkout redirect alone authorises nothing.
9. Handle renewals, cancellations, failed payments, refunds/chargebacks and expiry.
10. Keep an auditable history of payment and publishing events.

## Conceptual entities

- **Users**: account, auth identities.
- **Pages**: the editable document (same shape as the editor's page model: `theme`, ordered `sections`,
  `schemaVersion`), plus `ownerId`, `status`, `publishedRevision`, `slug`.
- **Media**: uploaded images, owned by a user, referenced from pages by `mediaId`.
- **PublishingPlans**: server-defined plans and prices.
- **Orders**: an attempt to buy a plan for a page.
- **Payments**: provider transactions linked to orders (idempotent, verified via webhooks).
- **Subscriptions**: recurring billing state for professional plans.
- **PublishingEntitlements**: the right to publish a specific page until a date (or while a subscription is active).

## Frontend boundaries already in place

| Concern | Today (Phase 3) | Later |
|---|---|---|
| Drafts | `localDrafts` (localStorage) | `remoteDrafts` (authenticated API) |
| Media | `localMedia` (IndexedDB) | `remoteMedia.upload` (signed upload) |
| Auth | `auth.getSession()` → always guest | real sessions |
| Publishing | `publishing.getPublishingOptions()` (hint only), `startCheckout()` unavailable | server checkout + webhooks |

All of these live in `src/editor/services/`. The UI never claims a cloud save, a payment or a live URL.
