/**
 * Stage 4 cloud drafts in the real editor (fake API with the /pages contract):
 * autosave, offline recovery, session expiry, reopening on another device,
 * revision conflicts, recovery after reload, deleted drafts, account changes
 * and device-only images.
 */
import 'fake-indexeddb/auto'
import { act, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTemplateBySlug } from '../data/templates.js'
import { createPageFromTemplate } from './model/page.js'
import { MISSING_IMAGE_SRC } from './model/mediaFallback.js'
import { EDITABLE_FIELDS } from './services/cloudDrafts.js'
import { putMedia } from './storage/mediaStore.js'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

vi.setConfig({ testTimeout: 20000 })
const SAVE_WAIT = { timeout: 6000 }

beforeEach(() => {
  // jsdom has no object URLs; images from IndexedDB get a fake one.
  URL.createObjectURL = vi.fn(() => `blob:fake-${Math.random().toString(36).slice(2)}`)
  URL.revokeObjectURL = vi.fn()
})

const editable = (page) => Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, structuredClone(page[k])]))
const newGardenPage = () => createPageFromTemplate(getTemplateBySlug('garden-vows'))
const toolbar = () => document.querySelector('.ed-toolbar')
const titleInput = () => within(toolbar()).getByLabelText('Page title')
const status = () => within(toolbar()).getByRole('status')
const recoveryKeys = () => Object.keys(localStorage).filter((k) => k.startsWith('mylinnnk.recovery.v1.'))
const guestDraftKeys = () => Object.keys(localStorage).filter((k) => k.startsWith('mylinnnk.draft'))

function signedInApi() {
  const api = createFakeAuthApi()
  const ana = api.addUser({ email: 'ana@example.com', displayName: 'Ana', emailVerified: true })
  api.signIn(ana)
  return { api, ana }
}

/** A cloud draft that already exists in Ana's account (e.g. made on another device). */
function seedCloud(api, ana, mutate) {
  const page = newGardenPage()
  page.title = 'From my laptop'
  mutate?.(page)
  const draft = api.seedPage(ana, page.id, editable(page))
  return { page, draft }
}

async function openEditor(path, api) {
  const app = renderApp(path, { api })
  await screen.findByRole('button', { name: 'Save draft' }, { timeout: 6000 })
  return app
}

async function retitle(user, text) {
  await user.clear(titleInput())
  await user.type(titleInput(), text)
}

describe('signed-in cloud autosave', () => {
  it('a new page becomes a cloud draft after the first edit, saved ~2 s after editing stops', async () => {
    const { api } = signedInApi()
    const { user, location } = await openEditor('/editor/garden-vows?new=1', api)
    expect(api.requestsTo('/pages').filter((r) => r.method === 'POST')).toHaveLength(0)
    expect(status()).toHaveTextContent('Not saved yet')

    await retitle(user, 'Our wedding')
    expect(status()).toHaveTextContent('Saving…')
    expect(recoveryKeys()).toHaveLength(1) // unconfirmed edits are kept right away
    expect(api.requestsTo('/pages').filter((r) => r.method === 'POST')).toHaveLength(0) // not before the delay

    await waitFor(() => expect(status()).toHaveTextContent('Saved to your account'), SAVE_WAIT)
    const [post] = api.requestsTo('/pages').filter((r) => r.method === 'POST')
    expect(post.body.clientId).toMatch(/^draft_[a-z0-9]{16}$/)
    expect(post.body.page).not.toHaveProperty('status')
    expect(post.body.page).not.toHaveProperty('id')
    expect(post.headers['X-CSRF-Token']).toBe(api.state.session.csrfToken)
    expect(api.state.pages[0]).toMatchObject({ title: 'Our wedding', clientId: post.body.clientId })
    await waitFor(() => expect(location()).toBe(`/editor/garden-vows?page=${api.state.pages[0].id}`))
    expect(recoveryKeys()).toHaveLength(0) // confirmed by the server
    expect(guestDraftKeys()).toHaveLength(0) // cloud drafts never go into guest storage
  })

  it('later edits PATCH with If-Match and only one request is ever in flight', async () => {
    const { api, ana } = signedInApi()
    const { draft } = seedCloud(api, ana)
    api.state.pageDelay = 400
    const { user } = await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    await retitle(user, 'First change')
    await waitFor(() => expect(api.requestsTo(`/pages/${draft.id}`).filter((r) => r.method === 'PATCH')).toHaveLength(1), SAVE_WAIT)
    await user.type(titleInput(), ' and more') // typed while the first save may still be in flight
    await waitFor(() => expect(status()).toHaveTextContent('Saved to your account'), SAVE_WAIT)
    await waitFor(() => expect(api.state.pages[0].title).toBe('First change and more'), SAVE_WAIT)
    const patches = api.requestsTo(`/pages/${draft.id}`).filter((r) => r.method === 'PATCH')
    expect(patches[0].headers['If-Match']).toBe('"1"')
    expect(patches.at(-1).headers['If-Match']).toBe(`"${api.state.pages[0].revision - 1}"`)
    expect(api.state.maxConcurrentPageRequests).toBe(1)
  })

  it('reopens a cloud draft from the account (another device): content comes from the server', async () => {
    const { api, ana } = signedInApi()
    const { draft } = seedCloud(api, ana)
    await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    expect(titleInput()).toHaveValue('From my laptop')
    expect(status()).toHaveTextContent('Saved to your account')
    expect(guestDraftKeys()).toHaveLength(0)
  })

  it('signed-out visitors are asked to log in to open a cloud draft', async () => {
    const { api, ana } = signedInApi()
    const { draft } = seedCloud(api, ana)
    api.expireSession()
    renderApp(`/editor/garden-vows?page=${draft.id}`, { api })
    expect(await screen.findByRole('heading', { name: 'Log in to open this draft' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', `/login?next=${encodeURIComponent(`/editor/garden-vows?page=${draft.id}`)}`)
  })
})

describe('failures never lose work', () => {
  it('offline: shows Offline / not saved, keeps a recovery copy and saves when back online', async () => {
    const { api, ana } = signedInApi()
    const { draft, page } = seedCloud(api, ana)
    const { user } = await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    api.state.pagesDown = true
    await retitle(user, 'Written offline')
    await waitFor(() => expect(status()).toHaveTextContent('Offline / not saved'), SAVE_WAIT)
    expect(screen.getByText(/You’re offline or MyLinnnk can’t be reached/)).toBeInTheDocument()
    const [key] = recoveryKeys()
    expect(key).toBe(`mylinnnk.recovery.v1.${ana.id}.${page.id}`)
    expect(JSON.parse(localStorage.getItem(key)).page.title).toBe('Written offline')
    expect(api.state.pages[0].title).toBe('From my laptop')

    api.state.pagesDown = false
    act(() => window.dispatchEvent(new Event('online')))
    await waitFor(() => expect(status()).toHaveTextContent('Saved to your account'), SAVE_WAIT)
    expect(api.state.pages[0].title).toBe('Written offline')
    expect(recoveryKeys()).toHaveLength(0)
  })

  it('session expiry: changes are kept and saving resumes after logging in again', async () => {
    const { api, ana } = signedInApi()
    const { draft } = seedCloud(api, ana)
    const { user } = await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    api.expireSession()
    await retitle(user, 'Kept while signed out')
    await waitFor(() => expect(status()).toHaveTextContent('Session expired'), SAVE_WAIT)
    expect(screen.getByText(/Your session has expired/)).toBeInTheDocument()
    expect(titleInput()).toHaveValue('Kept while signed out') // the editor stays open with the edits
    expect(recoveryKeys()).toHaveLength(1)

    api.signIn(ana) // logged in again in another tab
    await user.click(screen.getByRole('button', { name: 'I’ve logged in' }))
    await waitFor(() => expect(status()).toHaveTextContent('Saved to your account'), SAVE_WAIT)
    expect(api.state.pages[0].title).toBe('Kept while signed out')
  })

  it('signing in to a different account never saves into it', async () => {
    const { api, ana } = signedInApi()
    const { draft } = seedCloud(api, ana)
    const ben = api.addUser({ email: 'ben@example.com', displayName: 'Ben' })
    const { user } = await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    api.signIn(ben) // someone else logged in on this browser
    await retitle(user, 'Ana’s private edit')
    await waitFor(() => expect(status()).toHaveTextContent('Not saved: other account'), SAVE_WAIT)
    expect(api.state.pages.filter((p) => p.owner === ben.id)).toHaveLength(0)
    expect(api.state.pages[0].title).toBe('From my laptop')
    expect(recoveryKeys()).toEqual([`mylinnnk.recovery.v1.${ana.id}.${api.state.pages[0].clientId}`])
  })
})

describe('revision conflicts', () => {
  async function conflicted() {
    const { api, ana } = signedInApi()
    const { draft } = seedCloud(api, ana)
    const app = await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    api.editPageElsewhere(draft.id, (d) => (d.title = 'Saved on my phone'))
    await retitle(app.user, 'Edited on laptop')
    await waitFor(() => expect(status()).toHaveTextContent('Conflict'), SAVE_WAIT)
    expect(screen.getByText(/This draft was changed somewhere else/)).toBeInTheDocument()
    expect(api.state.pages[0].title).toBe('Saved on my phone') // nothing overwritten
    return { ...app, api, ana, draft }
  }

  it('“Save my version as a new copy” creates a separate draft with a new clientId', async () => {
    const { api, user, location, draft } = await conflicted()
    await user.click(screen.getByRole('button', { name: 'Resolve…' }))
    const dialog = await screen.findByRole('dialog', { name: 'This draft changed somewhere else' })
    await user.click(within(dialog).getByRole('button', { name: 'Save my version as a new copy' }))
    await waitFor(() => expect(api.state.pages).toHaveLength(2))
    const copy = api.state.pages[1]
    expect(copy.clientId).not.toBe(draft.clientId)
    expect(copy.title).toBe('Edited on laptop (copy)')
    expect(api.state.pages[0].title).toBe('Saved on my phone')
    await waitFor(() => expect(location()).toBe(`/editor/garden-vows?page=${copy.id}`))
    await waitFor(() => expect(titleInput()).toHaveValue('Edited on laptop (copy)'))
  })

  it('“Load newer cloud version” asks before discarding the unsaved edits', async () => {
    const { api, user } = await conflicted()
    await user.click(screen.getByRole('button', { name: 'Resolve…' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Load newer cloud version' }))
    const confirm = await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' })
    await user.click(within(confirm).getByRole('button', { name: 'Discard and load newer version' }))
    await waitFor(() => expect(titleInput()).toHaveValue('Saved on my phone'))
    expect(status()).toHaveTextContent('Saved to your account')
    expect(recoveryKeys()).toHaveLength(0)
    expect(api.state.pages[0].title).toBe('Saved on my phone')
    expect(api.state.pages).toHaveLength(1)
  })
})

describe('recovery after a reload or closed tab', () => {
  function writeRecovery(ana, draft, page, { baseRevision, title }) {
    localStorage.setItem(
      `mylinnnk.recovery.v1.${ana.id}.${page.id}`,
      JSON.stringify({ userId: ana.id, clientId: page.id, serverId: draft.id, baseRevision, templateSlug: 'garden-vows', title, page: { ...page, title }, savedAt: new Date().toISOString() }),
    )
  }

  it('offers to restore unsaved changes based on the current revision, then saves them', async () => {
    const { api, ana } = signedInApi()
    const { draft, page } = seedCloud(api, ana)
    writeRecovery(ana, draft, page, { baseRevision: 1, title: 'Not saved before the tab closed' })
    const { user } = await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    expect(screen.getByText(/You have unsaved changes from/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restore my changes' }))
    expect(titleInput()).toHaveValue('Not saved before the tab closed')
    await waitFor(() => expect(api.state.pages[0].title).toBe('Not saved before the tab closed'), SAVE_WAIT)
    expect(api.state.pages[0].revision).toBe(2)
  })

  it('never restores over a newer server version: offers a separate copy instead', async () => {
    const { api, ana } = signedInApi()
    const { draft, page } = seedCloud(api, ana)
    api.editPageElsewhere(draft.id, (d) => (d.title = 'Newer from phone'))
    writeRecovery(ana, draft, page, { baseRevision: 1, title: 'Old unsaved edit' })
    const { user } = await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    expect(titleInput()).toHaveValue('Newer from phone')
    expect(screen.queryByRole('button', { name: 'Restore my changes' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save them as a new copy' }))
    await waitFor(() => expect(api.state.pages).toHaveLength(2))
    expect(api.state.pages[1].title).toBe('Old unsaved edit (copy)')
    expect(api.state.pages[0].title).toBe('Newer from phone')
  })

  it('another account’s recovery copies are never shown', async () => {
    const { api, ana } = signedInApi()
    const { draft, page } = seedCloud(api, ana)
    localStorage.setItem(`mylinnnk.recovery.v1.someoneelse.${page.id}`, JSON.stringify({ userId: 'someoneelse', clientId: page.id, page: { ...page, title: 'Not yours' } }))
    await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    expect(screen.queryByText(/unsaved changes/)).not.toBeInTheDocument()
    expect(titleInput()).toHaveValue('From my laptop')
  })

  it('a draft deleted elsewhere is not restored; the edits can be saved as a new draft', async () => {
    const { api, ana } = signedInApi()
    const { draft } = seedCloud(api, ana)
    const { user } = await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    api.state.pages[0].deletedAt = new Date().toISOString()
    await retitle(user, 'Still mine')
    await waitFor(() => expect(status()).toHaveTextContent('Deleted from your account'), SAVE_WAIT)
    await user.click(screen.getByRole('button', { name: 'Save as a new draft' }))
    await waitFor(() => expect(api.state.pages).toHaveLength(2))
    expect(api.state.pages[0].deletedAt).toBeTruthy()
    expect(api.state.pages[1].title).toBe('Still mine (copy)')
  })
})

describe('device-only images', () => {
  function withUploads(page) {
    const hero = page.sections.find((s) => s.type === 'hero')
    hero.content.image = { alt: 'Us', mediaId: 'media_heroupload000001', original: hero.content.image }
    const gallery = page.sections.find((s) => s.type === 'gallery')
    gallery.content.images[0] = { alt: 'New photo', mediaId: 'media_galleryupload001' }
  }

  it('on another device: original template photo or a labelled placeholder, a count, and references kept on save', async () => {
    const { api, ana } = signedInApi()
    const { draft, page } = seedCloud(api, ana, withUploads)
    const heroOriginal = page.sections.find((s) => s.type === 'hero').content.image.original.src
    const { user } = await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    expect(await screen.findByText(/2 uploaded images are stored only on the device where they were added/)).toBeInTheDocument()
    const srcs = [...document.querySelectorAll('.ed-main img')].map((img) => img.getAttribute('src'))
    expect(srcs).toContain(heroOriginal)
    expect(srcs).toContain(MISSING_IMAGE_SRC)

    await retitle(user, 'Edited away from home')
    await waitFor(() => expect(status()).toHaveTextContent('Saved to your account'), SAVE_WAIT)
    const saved = api.state.pages[0]
    expect(saved.sections.find((s) => s.type === 'hero').content.image).toMatchObject({ alt: 'Us', mediaId: 'media_heroupload000001', original: { src: heroOriginal } })
    expect(saved.sections.find((s) => s.type === 'hero').content.image).not.toHaveProperty('src')
    expect(saved.sections.find((s) => s.type === 'gallery').content.images[0]).toEqual({ alt: 'New photo', mediaId: 'media_galleryupload001' })
    expect(JSON.stringify(saved)).not.toContain('data:image')
  })

  it('on the original device the IndexedDB images show and nothing is reported missing', async () => {
    const { api, ana } = signedInApi()
    const { draft, page } = seedCloud(api, ana, withUploads)
    for (const id of ['media_heroupload000001', 'media_galleryupload001']) {
      await putMedia({ id, draftId: page.id, blob: new Blob(['x'], { type: 'image/png' }), type: 'image/png', name: `${id}.png`, size: 1, width: 1, height: 1, createdAt: new Date().toISOString() })
    }
    await openEditor(`/editor/garden-vows?page=${draft.id}`, api)
    await waitFor(() => expect([...document.querySelectorAll('.ed-main img')].some((img) => img.getAttribute('src')?.startsWith('blob:fake'))).toBe(true))
    expect(screen.queryByText(/stored only on the device/)).not.toBeInTheDocument()
  })
})

describe('guests are unaffected', () => {
  it('guest editing saves locally and never calls the cloud API', async () => {
    const api = createFakeAuthApi()
    const { user, location } = await openEditor('/editor/garden-vows?new=1', api)
    await retitle(user, 'Guest page')
    await waitFor(() => expect(location()).toMatch(/^\/editor\/garden-vows\?draft=draft_/), SAVE_WAIT)
    expect(status()).toHaveTextContent('Saved on this device')
    expect(guestDraftKeys().length).toBeGreaterThan(0)
    expect(api.pageRequests()).toHaveLength(0)
  })

  it('a signed-in user opening a local draft keeps it local and is pointed to import', async () => {
    const page = newGardenPage()
    page.title = 'Made as a guest'
    localStorage.setItem(`mylinnnk.draft.v1.${page.id}`, JSON.stringify(page))
    localStorage.setItem('mylinnnk.drafts.index.v1', JSON.stringify([{ id: page.id, templateSlug: page.templateSlug, title: page.title, updatedAt: page.updatedAt }]))
    const { api } = signedInApi()
    const { user } = await openEditor(`/editor/garden-vows?draft=${page.id}`, api)
    expect(screen.getByText(/This draft is saved on this device only/)).toBeInTheDocument()
    await retitle(user, 'Still local')
    await waitFor(() => expect(status()).toHaveTextContent('Saved on this device'), SAVE_WAIT)
    expect(api.requestsTo('/pages').filter((r) => r.method === 'POST')).toHaveLength(0)
  })
})
