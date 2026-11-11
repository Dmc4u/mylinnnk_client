/**
 * Publishing boundary.
 *
 * Accounts live in src/auth (AuthProvider / useAuth). Plans and prices come
 * from the server (GET /api/v1/plans, see components/Pricing/usePlans.js).
 * Payments and publishing don't exist yet, so checkout is unavailable (no
 * simulated payments, no fake live URLs). When they arrive, the server, not
 * this file, will decide which plans apply, verify payments and grant
 * publishing. See docs/publishing-lifecycle.md.
 */
import { CATEGORY_PLAN_HINT } from '../config/plans.js'
import { FeatureUnavailableError } from './errors.js'

export const publishing = {
  /** The plan family this page would probably need ('celebration' | 'professional' | null). A UI hint only. */
  suggestedFamily(page) {
    return CATEGORY_PLAN_HINT[page.templateCategory] ?? null
  },
  async startCheckout() {
    throw new FeatureUnavailableError('payments', 'Paid publishing is coming soon.')
  },
}
