/**
 * Account page (Stage 4): cloud draft list and deletion, guest-draft import,
 * unsaved changes on this device and the logout warning.
 */
import 'fake-indexeddb/auto'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getTemplateBySlug } from '../data/templates.js'
import { createPageFromTemplate } from '../editor/model/page.js'
import { EDITABLE_FIELDS } from '../editor/services/cloudDrafts.js'
import { importLocalDraft } from '../editor/services/importService.js'
import { localDrafts } from '../editor/services/draftService.js'
import { getMedia, putMedia } from '../editor/storage/mediaStore.js'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

vi.setConfig({ testTimeout: 15000 })

const editable = (page) => Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, structuredClone(page[k])]))
const guestDraftStorage = () => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('mylinnnk.draft')).sort().map((k) => [k, localStorage.getItem(k)]))

function signedInApi() {
  const api = createFakeAuthApi()
  const ana = api.addUser({ email: 'ana@example.com', displayName: 'Ana', emailVerified: true })
  api.signIn(ana)
  return { api, ana }
}

/** Saves a guest draft on this device (optionally with an uploaded image in IndexedDB). */
async function guestDraft(slug, title, { withImage = false } = {}) {
  const page = createPageFromTemplate(getTemplateBySlug(slug))
  page.title = title
  if (withImage) {
    const mediaId = `media_${page.id.slice(6)}`
    const hero = page.sections.find((s) => s.type === 'hero')
    hero.content.image = { alt: 'Uploaded', mediaId, original: hero.content.image }
    await putMedia({ id: mediaId, draftId: page.id, blob: new Blob(['img'], { type: 'image/png' }), type: 'image/png', name: 'me.png', size: 3, width: 1, height: 1, createdAt: new Date().toISOString() })
  }
  await localDrafts.saveDraft(page)
  return page
}

const importSection = () => screen.getByRole('region', { name: 'Drafts on this device' })

describe('guest draft import', () => {
  it('imports selected drafts only after confirmation, keeping local drafts and their images', async () => {
    const first = await guestDraft('garden-vows', 'Wedding (guest)', { withImage: true })
    const second = await guestDraft('confetti-pop', 'Party (guest)')
    const before = guestDraftStorage()
    const { api, ana } = signedInApi()
    const { user } = renderApp('/account', { api })

    const section = await screen.findByRole('region', { name: 'Drafts on this device' })
    expect(within(section).getByText('Wedding (guest)')).toBeInTheDocument()
    expect(within(section).getByText(/1 uploaded image will be uploaded to your account after importing/)).toBeInTheDocument()
    expect(within(section).getAllByRole('checkbox', { checked: true })).toHaveLength(2)
    expect(api.requestsTo('/pages').filter((r) => r.method === 'POST')).toHaveLength(0) // never automatic

    await user.click(within(section).getByRole('button', { name: 'Import 2 drafts' }))
    const dialog = await screen.findByRole('dialog', { name: 'Import 2 drafts into your account?' })
    expect(within(dialog).getByText(/Wedding \(guest\)/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Garden Vows/)).toBeInTheDocument()
    expect(within(dialog).getByText(/1 uploaded image/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Import' }))

    await waitFor(() => expect(within(importSection()).getAllByText('In your account')).toHaveLength(2))
    const posts = api.requestsTo('/pages').filter((r) => r.method === 'POST')
    expect(posts.map((r) => r.body.clientId).sort()).toEqual([first.id, second.id].sort())
    expect(api.state.pages.every((p) => p.owner === ana.id)).toBe(true)
    expect(api.state.pages.find((p) => p.clientId === first.id).mediaIds).toEqual([`media_${first.id.slice(6)}`])

    expect(guestDraftStorage()).toEqual(before) // local drafts untouched
    expect(await getMedia(`media_${first.id.slice(6)}`)).toMatchObject({ draftId: first.id }) // image kept in IndexedDB
    expect(Object.keys(JSON.parse(localStorage.getItem(`mylinnnk.imports.v1.${ana.id}`)))).toEqual(expect.arrayContaining([first.id, second.id]))
  })

  it('cancelling the confirmation imports nothing', async () => {
    await guestDraft('garden-vows', 'Maybe later')
    const { api } = signedInApi()
    const { user } = renderApp('/account', { api })
    const section = await screen.findByRole('region', { name: 'Drafts on this device' })
    await user.click(within(section).getByRole('button', { name: 'Import selected draft' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(api.pageRequests().filter((r) => r.method === 'POST')).toHaveLength(0)
    expect(within(importSection()).queryByText('In your account')).not.toBeInTheDocument()
  })

  it('repeated imports never duplicate or overwrite', async () => {
    const page = await guestDraft('garden-vows', 'Imported twice')
    const { api, ana } = signedInApi()
    vi.stubGlobal('fetch', vi.fn(api.fetch))
    const withCsrf = (call) => call(api.state.session.csrfToken)
    const first = await importLocalDraft({ withCsrf, userId: ana.id, draftId: page.id })
    const again = await importLocalDraft({ withCsrf, userId: ana.id, draftId: page.id })
    expect(first).toMatchObject({ status: 'imported', created: true })
    expect(again).toMatchObject({ status: 'imported', created: false, pageId: first.pageId })
    expect(api.state.pages).toHaveLength(1)

    // Edited in the account since: re-importing the old local version is a conflict, nothing overwritten.
    api.editPageElsewhere(first.pageId, (d) => (d.title = 'Edited in the account'))
    localStorage.removeItem(`mylinnnk.imports.v1.${ana.id}`)
    const local = JSON.parse(localStorage.getItem(`mylinnnk.draft.v1.${page.id}`))
    localStorage.setItem(`mylinnnk.draft.v1.${page.id}`, JSON.stringify({ ...local, title: 'Changed locally too' }))
    const conflict = await importLocalDraft({ withCsrf, userId: ana.id, draftId: page.id })
    expect(conflict.status).toBe('conflict')
    expect(api.state.pages[0].title).toBe('Edited in the account')
  })

  it('an interrupted import can be retried', async () => {
    await guestDraft('garden-vows', 'Flaky network')
    const { api } = signedInApi()
    const { user } = renderApp('/account', { api })
    const section = await screen.findByRole('region', { name: 'Drafts on this device' })
    api.state.pagesDown = true
    await user.click(within(section).getByRole('button', { name: 'Import selected draft' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Import' }))
    await waitFor(() => expect(within(importSection()).getByText('Not imported')).toBeInTheDocument())
    expect(api.state.pages).toHaveLength(0)

    api.state.pagesDown = false
    await user.click(within(importSection()).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(within(importSection()).getByText('In your account')).toBeInTheDocument())
    expect(api.state.pages).toHaveLength(1)
  })

  it('“Not now” postpones the offer for this session', async () => {
    await guestDraft('garden-vows', 'Later please')
    const { api } = signedInApi()
    const { user } = renderApp('/account', { api })
    const section = await screen.findByRole('region', { name: 'Drafts on this device' })
    await user.click(within(section).getByRole('button', { name: 'Not now' }))
    expect(within(importSection()).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(within(importSection()).getByText(/1 draft on this device can be imported/)).toBeInTheDocument()
    await user.click(within(importSection()).getByRole('button', { name: 'Show them' }))
    expect(within(importSection()).getByRole('checkbox')).toBeChecked()
  })
})

describe('cloud drafts on the account page', () => {
  it('lists drafts with template and update time, links to the editor and deletes after confirmation', async () => {
    const { api, ana } = signedInApi()
    const wedding = createPageFromTemplate(getTemplateBySlug('garden-vows'))
    wedding.title = 'Our wedding'
    const party = createPageFromTemplate(getTemplateBySlug('confetti-pop'))
    party.title = 'Leo’s party'
    const weddingDraft = api.seedPage(ana, wedding.id, editable(wedding))
    api.seedPage(ana, party.id, editable(party))
    const { user } = renderApp('/account', { api })

    const list = await screen.findByRole('list', { name: 'Drafts in your account' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => li.querySelector('.account-drafts__title').textContent)).toEqual(['Leo’s party', 'Our wedding'])
    expect(within(items[1]).getByText(/Garden Vows · updated/)).toBeInTheDocument()
    expect(within(items[1]).getByRole('link', { name: 'Open Our wedding' })).toHaveAttribute('href', `/editor/garden-vows?page=${weddingDraft.id}`)

    await user.click(within(items[1]).getByRole('button', { name: 'Delete Our wedding' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete this draft?' })
    expect(within(dialog).getByText(/kept for 30 days/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete draft' }))
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Drafts in your account' })).getAllByRole('listitem')).toHaveLength(1))
    const del = api.requestsTo(`/pages/${weddingDraft.id}`).find((r) => r.method === 'DELETE')
    expect(del.headers['If-Match']).toBe('"1"')
    expect(del.headers['X-CSRF-Token']).toBe(api.state.session.csrfToken)
    expect(api.state.pages.find((p) => p.id === weddingDraft.id).deletedAt).toBeTruthy()
  })

  it('a stale delete (changed elsewhere) deletes nothing and explains', async () => {
    const { api, ana } = signedInApi()
    const page = createPageFromTemplate(getTemplateBySlug('garden-vows'))
    const draft = api.seedPage(ana, page.id, editable(page))
    const { user } = renderApp('/account', { api })
    const list = await screen.findByRole('list', { name: 'Drafts in your account' })
    api.editPageElsewhere(draft.id, (d) => (d.title = 'Changed on phone'))
    await user.click(within(list).getByRole('button', { name: /^Delete/ }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete draft' }))
    expect(await screen.findByText(/changed after this list was loaded, so it wasn’t deleted/)).toBeInTheDocument()
    expect(api.state.pages[0].deletedAt).toBeNull()
  })
})

describe('unsaved changes and logout', () => {
  function recoveryFor(ana, title) {
    const page = createPageFromTemplate(getTemplateBySlug('garden-vows'))
    localStorage.setItem(
      `mylinnnk.recovery.v1.${ana.id}.${page.id}`,
      JSON.stringify({ userId: ana.id, clientId: page.id, serverId: null, baseRevision: null, templateSlug: 'garden-vows', title, page: { ...page, title }, savedAt: new Date().toISOString() }),
    )
    return page
  }

  it('lists this account’s unsaved changes with a way to open them', async () => {
    const { api, ana } = signedInApi()
    const page = recoveryFor(ana, 'Typed on the train')
    renderApp('/account', { api })
    const section = await screen.findByRole('region', { name: 'Unsaved changes on this device' })
    expect(within(section).getByText('Typed on the train')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Open' })).toHaveAttribute('href', `/editor/garden-vows?recover=${page.id}`)
  })

  it('warns before logging out with unsaved changes, and keeps them', async () => {
    const { api, ana } = signedInApi()
    recoveryFor(ana, 'Not saved yet')
    const { user, location } = renderApp('/account', { api })
    await user.click(await screen.findByRole('button', { name: 'Log out' }))
    const dialog = await screen.findByRole('dialog', { name: 'Log out with unsaved changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(api.state.session).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Log out' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Log out anyway' }))
    await waitFor(() => expect(location()).toBe('/'))
    expect(api.state.session).toBeNull()
    expect(Object.keys(localStorage).filter((k) => k.startsWith('mylinnnk.recovery.v1.'))).toHaveLength(1)
  })

  it('logs out without a warning when everything is saved', async () => {
    const { api } = signedInApi()
    const { user, location } = renderApp('/account', { api })
    await user.click(await screen.findByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(location()).toBe('/'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('recovery copies stay with their account', () => {
  function anaWithRecovery() {
    const api = createFakeAuthApi()
    const ana = api.addUser({ email: 'ana@example.com', displayName: 'Ana', emailVerified: true })
    const ben = api.addUser({ email: 'ben@example.com', displayName: 'Ben', emailVerified: true })
    const page = createPageFromTemplate(getTemplateBySlug('garden-vows'))
    const cloud = api.seedPage(ana, page.id, editable(page))
    const key = `mylinnnk.recovery.v1.${ana.id}.${page.id}`
    const entry = { userId: ana.id, clientId: page.id, serverId: cloud.id, baseRevision: 1, templateSlug: 'garden-vows', title: 'Ana’s private draft', page: { ...page, title: 'Ana’s private draft' }, savedAt: new Date().toISOString() }
    localStorage.setItem(key, JSON.stringify(entry))
    api.signIn(ben) // another person uses this browser
    return { api, page, cloud, key, raw: localStorage.getItem(key) }
  }

  it('another account’s account page, logout and editor links never show them, and they are kept', async () => {
    const { api, key, raw } = anaWithRecovery()
    const { user, location } = renderApp('/account', { api })
    await screen.findByRole('region', { name: 'Your pages' })
    expect(screen.queryByRole('region', { name: 'Unsaved changes on this device' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Ana’s private draft/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log out' })) // Ben has nothing unsaved: no warning
    await waitFor(() => expect(location()).toBe('/'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem(key)).toBe(raw) // Ana's unsaved changes are untouched
  })

  it('opening the recovery link or the cloud draft as another account reveals nothing', async () => {
    const { api, page, cloud, key, raw } = anaWithRecovery()
    const first = renderApp(`/editor/garden-vows?recover=${page.id}`, { api })
    expect(await screen.findByRole('heading', { name: 'Draft not found' })).toBeInTheDocument()
    expect(screen.queryByText(/Ana’s private draft/)).not.toBeInTheDocument()
    first.unmount()

    renderApp(`/editor/garden-vows?page=${cloud.id}`, { api })
    expect(await screen.findByRole('heading', { name: 'Draft not found' })).toBeInTheDocument()
    expect(screen.getByText(/belongs to a different account/)).toBeInTheDocument()
    expect(localStorage.getItem(key)).toBe(raw)
  })
})
