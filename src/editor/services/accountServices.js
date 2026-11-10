/**
 * Publishing boundary.
 *
 * Accounts now live in src/auth (AuthProvider / useAuth). Publishing has no
 * backend yet, so checkout is unavailable (no simulated payments, no fake
 * live URLs). When it arrives, the server, not this file, will decide which
 * plans apply, verify payment via webhooks and grant publishing entitlements.
 * See docs/publishing-lifecycle.md.
 */
import { CATEGORY_PLAN_HINT, PLAN_FAMILIES } from '../config/plans.js'
import { FeatureUnavailableError } from './errors.js'

export const publishing = {
  /**
   * Plan families to present for this page. `suggested` is only a UI hint
   * from the template category; the server will make the real decision.
   */
  getPublishingOptions(page) {
    return {
      suggested: CATEGORY_PLAN_HINT[page.templateCategory] ?? null,
      families: [PLAN_FAMILIES.event, PLAN_FAMILIES.professional],
    }
  },
  async startCheckout() {
    throw new FeatureUnavailableError('payments', 'Publishing and payments are coming soon.')
  },
}
