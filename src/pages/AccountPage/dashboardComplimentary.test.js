/** The administrator's complimentary pages in the dashboard: "Manage" instead of a paid renewal, no reminders without an end date. */
import { describe, expect, it } from 'vitest'
import { dashboardCounts, publicationAction, renewalReminders } from './dashboardData.js'

const base = { slug: 'moses', pageId: 'p1', status: 'active', effectiveStatus: 'active', publiclyVisible: true, suspended: false, activatedAt: '2026-11-16T00:00:00.000Z' }

describe('complimentary publications', () => {
  it('are managed, not renewed through payment', () => {
    expect(publicationAction({ ...base, complimentary: true, expiresAt: null }, [])).toMatchObject({ canRenew: true, renewLabel: 'Manage' })
    expect(publicationAction({ ...base, complimentary: false, expiresAt: '2026-12-16T00:00:00.000Z' }, [])).toMatchObject({ canRenew: true, renewLabel: 'Renew' })
  })

  it('a page with no end date gets no reminder and is never "ending soon"', () => {
    const pub = { ...base, complimentary: true, expiresAt: null }
    expect(renewalReminders([pub], [])).toEqual([])
    expect(dashboardCounts({ drafts: [], publications: [pub] })).toMatchObject({ live: 1, expiringSoon: 0, attention: 0 })
  })
})
