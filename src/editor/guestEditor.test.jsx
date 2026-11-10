/**
 * Phase 3 guest workflow must keep working with accounts in place:
 * browse templates → open the editor → save locally → come back to the draft,
 * all without an account, and no auth action may touch local drafts.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getTemplateBySlug } from '../data/templates.js'
import { createPageFromTemplate } from './model/page.js'
import { setContent } from './model/operations.js'
import { localDrafts } from './services/draftService.js'
import { listLocalDrafts } from './storage/localDraftStore.js'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

const PASSWORD = 'correct horse battery'

async function seedDraft(title = 'Ana & Rui') {
  const page = setContent(createPageFromTemplate(getTemplateBySlug('garden-vows')), 'hero', ['title'], title)
  return localDrafts.saveDraft(page)
}

/** Every localStorage entry, to prove nothing was changed or removed. */
const snapshotStorage = () => Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]))

describe('guest editing without an account', () => {
  it('Create Your Page Free → template gallery → chosen template’s editor, no login', async () => {
    const { user, location } = renderApp('/')
    const hero = screen.getAllByRole('link', { name: 'Create Your Page Free' })
    await user.click(hero[1]) // the homepage hero button (the header's is first)
    await waitFor(() => expect(location()).toBe('/templates'))
    await user.click(await screen.findByRole('link', { name: 'Use This Template: Coastal Evening' }))
    expect(await screen.findByRole('button', { name: 'Save draft' }, { timeout: 5000 })).toBeInTheDocument()
    expect(location().startsWith('/editor/coastal-evening')).toBe(true)
  })

  it('templates can be browsed and opened in the editor while signed out', async () => {
    const { user, location } = renderApp('/templates')
    const useTemplate = await screen.findByRole('link', { name: 'Use This Template: Garden Vows' })
    expect(useTemplate).toHaveAttribute('href', '/editor/garden-vows')
    await user.click(useTemplate)
    expect(await screen.findByRole('button', { name: 'Save draft' }, { timeout: 5000 })).toBeInTheDocument()
    expect(location()).toMatch(/^\/editor\/garden-vows/)
  })

  it('the editor opens even when the API is unreachable', async () => {
    const api = createFakeAuthApi()
    api.state.down = true
    const { location } = renderApp('/editor/garden-vows?new=1', { api })
    expect(await screen.findByRole('button', { name: 'Save draft' }, { timeout: 5000 })).toBeInTheDocument()
    expect(location()).toBe('/editor/garden-vows?new=1')
  })

  it('an existing local draft reopens from its URL, signed out or signed in', async () => {
    const draft = await seedDraft('Our garden day')
    renderApp(`/editor/garden-vows?draft=${draft.id}`)
    expect(await screen.findByRole('button', { name: 'Save draft' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getAllByText('Our garden day').length).toBeGreaterThan(0)
  })

  it('offers to continue an existing draft for the template', async () => {
    await seedDraft()
    renderApp('/editor/garden-vows')
    expect(await screen.findByText('Continue editing Garden Vows?', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('Save Draft keeps the draft on this device and offers accounts in a new tab', async () => {
    const draft = await seedDraft()
    const { user } = renderApp(`/editor/garden-vows?draft=${draft.id}`)
    await user.click(await screen.findByRole('button', { name: 'Save draft' }, { timeout: 5000 }))
    const dialog = await screen.findByRole('dialog', { name: 'Save your draft' })
    expect(within(dialog).getByText('Your draft is saved on this device. It is not saved to any account.')).toBeInTheDocument()
    for (const [name, href] of [
      ['Log in', '/login'],
      ['Sign up free', '/signup'],
    ]) {
      const link = within(dialog).getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener')
    }
  })

  it('signed-in users are told honestly that account saving is not available yet', async () => {
    const draft = await seedDraft()
    const api = createFakeAuthApi()
    api.signIn(api.addUser({ email: 'ana@example.com', displayName: 'Ana' }))
    const { user } = renderApp(`/editor/garden-vows?draft=${draft.id}`, { api })
    await screen.findByRole('button', { name: 'Save draft' }, { timeout: 5000 })
    await waitFor(() => expect(api.requestsTo('/auth/session')).toHaveLength(1))
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    const dialog = await screen.findByRole('dialog', { name: 'Save your draft' })
    await waitFor(() => expect(within(dialog).getByText(/You’re logged in as/)).toHaveTextContent('Ana'))
    expect(within(dialog).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
  })
})

describe('auth actions never touch guest drafts', () => {
  it('sign up, log out, log in and password reset leave every local draft exactly as it was', async () => {
    await seedDraft('First draft')
    await seedDraft('Second draft')
    const before = snapshotStorage()
    expect(listLocalDrafts()).toHaveLength(2)

    const api = createFakeAuthApi()
    const { user, location } = renderApp('/signup', { api })
    await user.type(await screen.findByLabelText('Your name'), 'Ana')
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(location()).toBe('/account'))
    expect(snapshotStorage()).toEqual(before)

    await user.click(screen.getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(location()).toBe('/'))
    expect(snapshotStorage()).toEqual(before)

    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Log in' }))
    await user.type(await screen.findByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(within(screen.getByRole('banner')).getByRole('button', { name: /Account menu for Ana/ })).toBeInTheDocument())
    expect(snapshotStorage()).toEqual(before)
    expect(listLocalDrafts()).toHaveLength(2)
  })

  it('a password reset (which signs out everywhere) keeps local drafts', async () => {
    await seedDraft()
    const before = snapshotStorage()
    const api = createFakeAuthApi()
    const ana = api.addUser({ email: 'ana@example.com' })
    api.signIn(ana)
    const token = api.issueToken(ana, 'password_reset')
    const { user } = renderApp(`/reset-password?token=${token}`, { api })
    await user.type(await screen.findByLabelText('New password'), 'a brand new password')
    await user.type(screen.getByLabelText('Confirm new password'), 'a brand new password')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByText('Your new password is set.')).toBeInTheDocument()
    expect(snapshotStorage()).toEqual(before)
  })
})
