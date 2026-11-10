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
published ──(one-time pass period ends / subscription cancelled or renewal failed)──▶ expired
published ──(subscription renews / pass extended / plan switched, verified webhook)──▶ published
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

| Plan ID | Family | Billing | Renewal |
|---|---|---|---|
| `event-pass` | Personal event page | One-time payment for a fixed publication period | Never renews automatically |
| `pro-pass` | Professional page | One-time payment for a fixed publication period | Never renews automatically |
| `pro-monthly` | Professional page | Subscription, billed monthly | Renews monthly until cancelled |
| `pro-annual` | Professional page | Subscription, billed annually | Renews annually until cancelled |

- Prices (`price`) and publication periods (`periodDays`) are configuration, `null` in the frontend until the
  server provides them. Different plans may have different periods (e.g. the event pass and the professional pass).
- The template category only provides a **suggested** plan family. The server applies the actual eligibility rules.

### Renewal and switching rules

- **One-time passes never renew automatically.** Before the period ends the owner can buy another pass
  (extending the period) or switch to a subscription (professional pages only). If they do nothing, the page
  moves to `expired`.
- **Subscriptions renew automatically** according to the billing agreement the user accepted (monthly or annual)
  until cancelled. Cancelling keeps the page live until the end of the paid period, then it moves to `expired`.
  A failed renewal payment follows the provider's retry/grace rules before the page expires.
- **Switching plans** (e.g. pass → monthly, monthly → annual, annual → pass at renewal) changes only the
  entitlement and billing records. The page document, its drafts and media are untouched. Proration, credits
  and switch timing are decided server-side and will be defined with the payment provider.
- **Expiry never deletes content.** An `expired` page keeps its document, published revision, drafts and media;
  renewing or buying a new plan returns it to `published` without rebuilding anything.

## Backend responsibilities (future phases)

1. Authenticate the user.
2. Validate page ownership for every draft, media and publish operation.
3. Determine applicable publishing plans for the page.
4. Create a checkout session with the payment provider (server-side amounts only).
5. Receive payment provider webhooks and verify their signatures.
6. Record the payment transaction idempotently (keyed by provider event/payment ID).
7. Create or extend the `PublishingEntitlement`.
8. Publish the page only after a verified, recorded payment. A checkout redirect alone authorises nothing.
9. Handle subscription renewals, one-time pass extensions, plan switches, cancellations, failed payments,
   refunds/chargebacks and expiry, without touching page content.
10. Keep an auditable history of payment and publishing events.

## Conceptual entities

- **Users**: account, auth identities.
- **Pages**: the editable document (same shape as the editor's page model: `theme`, ordered `sections`,
  `schemaVersion`), plus `ownerId`, `status`, `publishedRevision`, `slug`.
- **Media**: uploaded images, owned by a user, referenced from pages by `mediaId`.
- **PublishingPlans**: server-defined plans and prices.
- **Orders**: an attempt to buy a plan for a page.
- **Payments**: provider transactions linked to orders (idempotent, verified via webhooks).
- **Subscriptions**: recurring billing state for `pro-monthly` / `pro-annual` (status, current period end, cancel-at-period-end).
- **PublishingEntitlements**: the right to publish a specific page, linked to the plan that granted it:
  until a fixed date (one-time passes) or while a subscription is active. Plan switches create or update an
  entitlement; they never modify the page document.

## Frontend boundaries already in place

| Concern | Today (Phase 3) | Later |
|---|---|---|
| Drafts | `localDrafts` (localStorage) | `remoteDrafts` (authenticated API) |
| Media | `localMedia` (IndexedDB) | `remoteMedia.upload` (signed upload) |
| Auth | `auth.getSession()` → always guest | real sessions |
| Publishing | `publishing.getPublishingOptions()` (hint only), `startCheckout()` unavailable | server checkout + webhooks |

All of these live in `src/editor/services/`. The UI never claims a cloud save, a payment or a live URL.
