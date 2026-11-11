/**
 * Stage 5: images of signed-in users' cloud drafts upload to the account in
 * the background (fake API with the /media contract) and render on any device.
 */
import 'fake-indexeddb/auto'
// Node's Blob survives fake-indexeddb's structured cloning (jsdom's doesn't); real browsers store Blobs natively.
import { Blob } from 'node:buffer'
import { act, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTemplateBySlug } from '../data/templates.js'
import { createPageFromTemplate } from './model/page.js'
import { EDITABLE_FIELDS } from './services/cloudDrafts.js'
import { localDrafts } from './services/draftService.js'
import { importLocalDraft } from './services/importService.js'
import { remoteMedia } from './services/mediaService.js'
import { syncMedia } from './services/mediaSync.js'
import { cloudOwner, getMedia, localOwner, putMedia } from './storage/mediaStore.js'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

vi.setConfig({ testTimeout: 20000 })
const WAIT = { timeout: 6000 }
let seq = 0

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => `blob:fake-${Math.random().toString(36).slice(2)}`)
  URL.revokeObjectURL = vi.fn()
})

const newMediaId = () => `media_sync${String(Date.now()).slice(-8)}${String(seq++).padStart(4, '0')}`
const editable = (page) => Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, structuredClone(page[k])]))
const mediaStatus = () => screen.queryByTestId('media-status')?.textContent ?? ''
const pageStatus = () => within(document.querySelector('.ed-toolbar')).getByRole('status').textContent

function signedInApi() {
  const api = createFakeAuthApi()
  const ana = api.addUser({ email: 'ana@example.com', displayName: 'Ana', emailVerified: true })
  api.signIn(ana)
  return { api, ana }
}

/** An image in this browser's IndexedDB, owned by `owner`. */
async function localImage(owner, bytes = `png-${Math.random()}`) {
  const id = newMediaId()
  await putMedia({ id, draftId: owner.split(':')[1], owners: [owner], blob: new Blob([bytes], { type: 'image/png' }), type: 'image/png', name: 'me.png', size: bytes.length, width: 10, height: 10, createdAt: new Date().toISOString() })
  return id
}

/** A garden-vows page whose hero uses `mediaId`. */
function pageUsing(mediaId) {
  const page = createPageFromTemplate(getTemplateBySlug('garden-vows'))
  const hero = page.sections.find((s) => s.type === 'hero')
  hero.content.image = { alt: 'Us', mediaId, original: hero.content.image }
  return page
}

async function openCloudDraft(api, ana, mediaId) {
  const page = pageUsing(mediaId)
  const draft = api.seedPage(ana, page.id, editable(page))
  const app = renderApp(`/editor/garden-vows?page=${draft.id}`, { api })
  await screen.findByRole('button', { name: 'Save draft' }, WAIT)
  return { ...app, page, draft }
}

describe('uploading a cloud draft’s images', () => {
  it('uploads the local image once, confirms it, and keeps the local copy', async () => {
    const { api, ana } = signedInApi()
    const page = pageUsing('media_placeholder000')
    const mediaId = await localImage(cloudOwner(page.id))
    await openCloudDraft(api, ana, mediaId)
    await waitFor(() => expect(mediaStatus()).toBe('Images synced'), WAIT)
    const puts = api.mediaRequests('PUT')
    expect(puts).toHaveLength(1)
    expect(puts[0].path).toBe(`/media/${mediaId}`)
    expect(puts[0].headers['Content-Type']).toBe('image/png')
    expect(puts[0].headers['X-CSRF-Token']).toBe(api.state.session.csrfToken)
    expect(api.state.media.map((m) => m.mediaId)).toEqual([mediaId])
    const local = await getMedia(mediaId)
    expect(local.blob).toBeInstanceOf(Blob) // never deleted after upload
    expect(local.uploaded?.[ana.id]).toBeTruthy()
  })

  it('shows “Images uploading…” until the server confirms, then “Images synced”', async () => {
    const { api, ana } = signedInApi()
    api.state.mediaDelay = 700
    const mediaId = await localImage(cloudOwner('draft_status0000000001'))
    await openCloudDraft(api, ana, mediaId)
    await waitFor(() => expect(mediaStatus()).toMatch(/Images uploading…|Checking images…/), WAIT)
    expect(mediaStatus()).not.toBe('Images synced')
    await waitFor(() => expect(mediaStatus()).toBe('Images synced'), WAIT)
  })

  it('never marks an image synced without the server confirming that exact image', async () => {
    const { ana } = signedInApi()
    const { api } = { api: createFakeAuthApi() }
    vi.stubGlobal('fetch', vi.fn(api.fetch))
    const mediaId = await localImage(cloudOwner('draft_unconfirmed00001'))
    vi.spyOn(remoteMedia, 'availability').mockResolvedValue({ available: [], missing: [mediaId] })
    vi.spyOn(remoteMedia, 'upload').mockResolvedValue({ created: true, media: { mediaId: 'media_someotherimage1' } })
    await syncMedia({ userId: ana.id, mediaIds: [mediaId], withCsrf: (call) => call('csrf') })
    await waitFor(async () => expect((await getMedia(mediaId)).uploaded).toBeUndefined())
    const { statusesFor } = await import('./services/mediaSync.js')
    await waitFor(() => expect(statusesFor(ana.id, [mediaId]).get(mediaId)?.status).toBe('failed'))
  })

  it('concurrent sync requests upload each image only once', async () => {
    const { api, ana } = signedInApi()
    vi.stubGlobal('fetch', vi.fn(api.fetch))
    api.state.mediaDelay = 200
    const mediaId = await localImage(cloudOwner('draft_concurrent000001'))
    const withCsrf = (call) => call(api.state.session.csrfToken)
    await Promise.all([1, 2, 3].map(() => syncMedia({ userId: ana.id, mediaIds: [mediaId], withCsrf })))
    await waitFor(() => expect(api.state.media).toHaveLength(1), WAIT)
    expect(api.mediaRequests('PUT')).toHaveLength(1)
  })
})

describe('failures and retries', () => {
  it('a failed upload keeps the local image, says so, and succeeds on retry', async () => {
    const { api, ana } = signedInApi()
    api.state.mediaFailures = 1 // the server's storage fails once
    const mediaId = await localImage(cloudOwner('draft_retry00000000001'))
    const { user } = await openCloudDraft(api, ana, mediaId)
    await waitFor(() => expect(mediaStatus()).toBe('Image upload failed (1)'), WAIT)
    expect(screen.getByText(/couldn’t be uploaded to your account/)).toBeInTheDocument()
    expect((await getMedia(mediaId)).blob).toBeInstanceOf(Blob)
    await user.click(screen.getByRole('button', { name: 'Retry uploads' }))
    await waitFor(() => expect(mediaStatus()).toBe('Images synced'), WAIT)
    expect(api.state.media).toHaveLength(1)
  })

  it('uploads resume when the connection comes back', async () => {
    const { api, ana } = signedInApi()
    const mediaId = await localImage(cloudOwner('draft_offline000000001'))
    api.state.mediaDown = true
    await openCloudDraft(api, ana, mediaId)
    await waitFor(() => expect(mediaStatus()).toMatch(/Image upload failed/), WAIT)
    api.state.mediaDown = false
    act(() => window.dispatchEvent(new Event('online')))
    await waitFor(() => expect(mediaStatus()).toBe('Images synced'), WAIT)
  })

  it('a conflicting image under the same id is reported and not retried', async () => {
    const { api, ana } = signedInApi()
    const mediaId = await localImage(cloudOwner('draft_conflict00000001'), 'mine')
    api.seedMedia(ana, mediaId, 'a different file')
    vi.spyOn(remoteMedia, 'availability').mockResolvedValue({ available: [], missing: [mediaId] })
    await openCloudDraft(api, ana, mediaId)
    await waitFor(() => expect(mediaStatus()).toBe('Image upload failed (1)'), WAIT)
    const puts = api.mediaRequests('PUT').length
    act(() => window.dispatchEvent(new Event('online')))
    await new Promise((r) => setTimeout(r, 300))
    expect(api.mediaRequests('PUT')).toHaveLength(puts)
  })

  it('page saving is independent from image uploads', async () => {
    const { api, ana } = signedInApi()
    const mediaId = await localImage(cloudOwner('draft_independent0001'))
    api.state.mediaDown = true
    const { user } = await openCloudDraft(api, ana, mediaId)
    const title = within(document.querySelector('.ed-toolbar')).getByLabelText('Page title')
    await user.clear(title)
    await user.type(title, 'Saved without images')
    await waitFor(() => expect(pageStatus()).toMatch(/Saved to your account/), WAIT)
    expect(mediaStatus()).toMatch(/Image upload failed/)
    expect(api.state.pages[0].title).toBe('Saved without images')
  })
})

describe('what is uploaded', () => {
  it('guests never upload, and a signed-in user’s local draft isn’t uploaded either', async () => {
    const guestPage = pageUsing(await localImage(localOwner('draft_guest00000000001')))
    guestPage.id = 'draft_guest00000000001'
    await localDrafts.saveDraft(guestPage)
    const guestApi = createFakeAuthApi()
    const guest = renderApp(`/editor/garden-vows?draft=${guestPage.id}`, { api: guestApi })
    await screen.findByRole('button', { name: 'Save draft' }, WAIT)
    await new Promise((r) => setTimeout(r, 300))
    expect(guestApi.mediaRequests()).toHaveLength(0)
    expect(screen.queryByTestId('media-status')).not.toBeInTheDocument()
    guest.unmount()

    const { api } = signedInApi()
    renderApp(`/editor/garden-vows?draft=${guestPage.id}`, { api })
    await screen.findByRole('button', { name: 'Save draft' }, WAIT)
    await new Promise((r) => setTimeout(r, 300))
    expect(api.mediaRequests()).toHaveLength(0)
  })

  it('importing a guest draft uploads its images', async () => {
    const page = pageUsing('media_placeholder000')
    const mediaId = await localImage(localOwner(page.id))
    page.sections.find((s) => s.type === 'hero').content.image.mediaId = mediaId
    await localDrafts.saveDraft(page)
    const { api, ana } = signedInApi()
    vi.stubGlobal('fetch', vi.fn(api.fetch))
    const result = await importLocalDraft({ withCsrf: (call) => call(api.state.session.csrfToken), userId: ana.id, draftId: page.id })
    expect(result.status).toBe('imported')
    await waitFor(() => expect(api.state.media.map((m) => m.mediaId)).toEqual([mediaId]), WAIT)
    expect((await getMedia(mediaId)).owners).toEqual(expect.arrayContaining([localOwner(page.id), cloudOwner(page.id)]))
  })

  it('a copy that uses an already-uploaded image doesn’t upload it again', async () => {
    const { api, ana } = signedInApi()
    const mediaId = await localImage(cloudOwner('draft_original000000001'))
    api.seedMedia(ana, mediaId)
    await openCloudDraft(api, ana, mediaId)
    await waitFor(() => expect(mediaStatus()).toBe('Images synced'), WAIT)
    expect(api.mediaRequests('PUT')).toHaveLength(0)
  })
})

describe('cross-device rendering', () => {
  it('an image uploaded from another device renders from the account', async () => {
    const { api, ana } = signedInApi()
    const mediaId = newMediaId() // not in this browser
    api.seedMedia(ana, mediaId)
    await openCloudDraft(api, ana, mediaId)
    await waitFor(() => expect([...document.querySelectorAll('.ed-main img')].some((img) => img.getAttribute('src') === `/api/v1/media/${mediaId}/content`)).toBe(true), WAIT)
    expect(screen.queryByText(/stored only on the device/)).not.toBeInTheDocument()
    expect(mediaStatus()).toBe('Images synced')
  })

  it('this device’s copy wins over the account copy; nothing is uploaded twice', async () => {
    const { api, ana } = signedInApi()
    const mediaId = await localImage(cloudOwner('draft_localwins000001'))
    api.seedMedia(ana, mediaId)
    await openCloudDraft(api, ana, mediaId)
    await waitFor(() => expect([...document.querySelectorAll('.ed-main img')].some((img) => img.getAttribute('src')?.startsWith('blob:fake'))).toBe(true), WAIT)
    expect(api.mediaRequests('PUT')).toHaveLength(0)
  })

  it('an image on neither this device nor the account falls back without changing the page', async () => {
    const { api, ana } = signedInApi()
    const mediaId = newMediaId()
    const { page } = await openCloudDraft(api, ana, mediaId)
    const original = page.sections.find((s) => s.type === 'hero').content.image.original.src
    await waitFor(() => expect(screen.getByText(/1 uploaded image is stored only on the device where it was added/)).toBeInTheDocument(), WAIT)
    expect([...document.querySelectorAll('.ed-main img')].some((img) => img.getAttribute('src') === original)).toBe(true)
    expect(mediaStatus()).toBe('1 image not uploaded yet')
    expect(api.state.pages[0].sections.find((s) => s.type === 'hero').content.image.mediaId).toBe(mediaId)
  })
})
