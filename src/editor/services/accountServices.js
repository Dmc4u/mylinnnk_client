/**
 * Authentication and publishing boundaries.
 *
 * There is no backend yet, so:
 * - every visitor is a guest;
 * - sign-up / log-in are unavailable (no fake accounts);
 * - checkout is unavailable (no simulated payments, no fake live URLs).
 *
 * When the backend arrives, these functions will call it. The server — not
 * this file — will decide which plans apply, verify payment via webhooks and
 * grant publishing entitlements. See docs/publishing-lifecycle.md.
 */
import { CATEGORY_PLAN_HINT, PLAN_FAMILIES } from '../config/plans.js'
import { FeatureUnavailableError } from './errors.js'

export const auth = {
  async getSession() {
    return { status: 'guest', user: null }
  },
  async signUp() {
    throw new FeatureUnavailableError('accounts', 'Accounts are coming soon.')
  },
  async logIn() {
    throw new FeatureUnavailableError('accounts', 'Accounts are coming soon.')
  },
}

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
