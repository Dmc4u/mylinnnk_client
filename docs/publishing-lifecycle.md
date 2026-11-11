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

## Plans (Phase 5, Stage 1)

Plans and prices are defined by the API (`mylinnnk_api/config/plans.js`, served by `GET /api/v1/plans`). The
frontend keeps only the stable ids, category hints and display helpers (`src/editor/config/plans.js`) and
shows whatever the server returns (`src/components/Pricing/`, `/pricing`, the editor's Publish dialog).
Prices are per published page, in naira (amounts in kobo). Nothing renews or charges automatically.

| Plan ID | Plan | Billing | Validity | Price |
|---|---|---|---|---|
| `free` | Free Editor | free | Drafts only, no publishing | ₦0 |
| `celebration` | Celebration (birthdays, anniversaries, weddings) | one-time | 30 days | ₦2,500 |
| `pro-starter` | Professional Starter | one-time | 90 days | ₦7,500 |
| `pro-monthly` | Professional Monthly (featured) | manual renewal | 30 days per payment | ₦3,000 |
| `pro-annual` | Professional Annual | manual renewal | 365 days per payment | ₦24,000 (saves 33%) |
| `special-request` | Special Request | custom quotation | agreed individually | quoted |

- Stage 1 only lets people compare and choose a plan: no checkout, orders, payments or publishing yet.
- The template category only provides a **suggested** plan family. The server will apply the actual
  eligibility rules when publishing exists.

### Renewal and switching rules

- _Note: "subscriptions" below means the monthly and annual plans. At launch they are renewed manually (no
  automatic charges); automatic renewal needs a payment provider and will be decided later._
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

## Expiration of paid publications (future requirement)

Every paid publishing method has a validity period (exact one-time durations are set in the pricing phase).
Publication records will store `publishedAt`, `expiresAt`, `graceEndsAt`, a lifecycle status and a
payment or subscription reference. None of this exists yet; drafts carry no publication or payment fields.

1. After a verified payment the page is public for the purchased period.
2. At `expiresAt` a grace period of exactly 24 hours starts (`graceEndsAt = expiresAt + 24 h`) and the user
   is told that payment or renewal is needed.
3. Renewing during the grace period extends or reactivates the publication according to the plan.
4. Without renewal by `graceEndsAt` the page is unpublished.
5. Media stored only for that expired publication is then scheduled for deletion by an idempotent
   background job (MongoDB TTL can't delete Cloud Storage objects). Images used by another active
   publication, a retained draft or the user's media library are never deleted.
6. The editable draft (text, layout, theme, design) is always kept; the user can pay again and republish,
   re-uploading any images that were removed. Customers are told this before paying.

User-requested deletion of a draft is separate: a soft delete kept for 30 days (Stage 4).

## Frontend boundaries already in place

| Concern | Today (Phase 5, Stage 1) | Later |
|---|---|---|
| Drafts | Guests: `localDrafts` (localStorage). Signed in: cloud drafts (`cloudDrafts.js`, `/api/v1/pages`) with recovery copies until the server confirms | In place |
| Media | `localMedia` (IndexedDB) on the device that added the image, always kept. Each image lists the drafts that use it (`owners`: `local:<id>` / `cloud:<clientId>`); copies and imports share the file, and deleting a draft only releases its claim. For a signed-in user's cloud drafts, `mediaSync` uploads images in the background (on create, import, open and reconnect; retry-safe, server-confirmed) to the account's private storage (`/api/v1/media`, local folder in development, private Cloud Storage in production); other devices then load them via `/api/v1/media/:id/content`. Guest and local-draft images are never uploaded. Display order: this device → account → template photo → placeholder | Public delivery of published pages' images |
| Auth | Cookie sessions + CSRF (`src/auth`) | In place |
| Pricing | `GET /api/v1/plans` → `usePlans()`; `/pricing` and the Publish dialog show server prices; choosing a plan only selects it | admin-managed prices |
| Publishing | `publishing.suggestedFamily()` (hint only), `startCheckout()` unavailable | payment orders, manual verification, publication |

These live in `src/editor/services/` and `src/auth/`. The UI shows "Saved to your account" only after the
server confirms a save, and never claims a payment or a live URL.
