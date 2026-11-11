/**
 * Image ownership in this browser (storage/mediaStore.js): copies and imports
 * share image files with the original draft without depending on it.
 * Deleting one draft releases only its claim; files are removed when no draft
 * uses them any more.
 */
import 'fake-indexeddb/auto'
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTemplateBySlug } from '../data/templates.js'
import { createPageFromTemplate } from './model/page.js'
import { EDITABLE_FIELDS } from './services/cloudDrafts.js'
import { localDrafts } from './services/draftService.js'
import { importLocalDraft } from './services/importService.js'
import { claimMedia, cloudOwner, getMedia, listMedia, localOwner, putMedia, releaseMedia, releaseOwnerMedia } from './storage/mediaStore.js'
import { createFakeAuthApi } from '../test/fakeAuthApi.js'
import { renderApp } from '../test/renderApp.jsx'

vi.setConfig({ testTimeout: 20000 })

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => `blob:fake-${Math.random().toString(36).slice(2)}`)
  URL.revokeObjectURL = vi.fn()
})

let seq = 0
const mediaRecord = (draftId, owner = localOwner(draftId)) => ({
  id: `media_test${String(seq++).padStart(12, '0')}`,
  draftId,
  owners: [owner],
  blob: new Blob(['img'], { type: 'image/png' }),
  type: 'image/png',
  name: 'photo.png',
  size: 3,
  width: 1,
  height: 1,
  createdAt: new Date(Date.now() + seq).toISOString(),
})

/** A guest draft on this device whose hero uses an uploaded image. */
async function localDraftWithImage(title = 'Original guest draft') {
  const page = createPageFromTemplate(getTemplateBySlug('garden-vows'))
  page.title = title
  const record = mediaRecord(page.id)
  await putMedia(record)
  const hero = page.sections.find((s) => s.type === 'hero')
  hero.content.image = { alt: 'Uploaded', mediaId: record.id, original: hero.content.image }
  await localDrafts.saveDraft(page)
  return { page, mediaId: record.id }
}

function signedInApi() {
  const api = createFakeAuthApi()
  const ana = api.addUser({ email: 'ana@example.com', displayName: 'Ana', emailVerified: true })
  api.signIn(ana)
  vi.stubGlobal('fetch', vi.fn(api.fetch))
  return { api, ana, withCsrf: (call) => call(api.state.session.csrfToken) }
}

describe('media store ownership', () => {
  it('a file shared by two drafts survives releasing one owner and is deleted after the last', async () => {
    const record = mediaRecord('draft_aaaaaaaaaaaaaaaa')
    await putMedia(record)
    await claimMedia([record.id], cloudOwner('draft_bbbbbbbbbbbbbbbb'))
    expect((await getMedia(record.id)).owners).toEqual([localOwner('draft_aaaaaaaaaaaaaaaa'), cloudOwner('draft_bbbbbbbbbbbbbbbb')])

    await releaseOwnerMedia(localOwner('draft_aaaaaaaaaaaaaaaa'))
    expect((await getMedia(record.id)).owners).toEqual([cloudOwner('draft_bbbbbbbbbbbbbbbb')])
    expect(await listMedia(localOwner('draft_aaaaaaaaaaaaaaaa'))).toHaveLength(0)
    expect((await listMedia(cloudOwner('draft_bbbbbbbbbbbbbbbb'))).map((r) => r.id)).toEqual([record.id])

    await releaseMedia(record.id, cloudOwner('draft_bbbbbbbbbbbbbbbb'))
    expect(await getMedia(record.id)).toBeNull() // no orphan left behind
  })

  it('claiming twice adds no duplicate owner and copies no files', async () => {
    const record = mediaRecord('draft_cccccccccccccccc')
    await putMedia(record)
    await claimMedia([record.id, record.id], cloudOwner('draft_dddddddddddddddd'))
    await claimMedia([record.id], cloudOwner('draft_dddddddddddddddd'))
    expect((await getMedia(record.id)).owners).toHaveLength(2)
    expect((await listMedia(cloudOwner('draft_dddddddddddddddd'))).length).toBe(1)
  })

  it('deleting a draft removes only the images nobody else uses', async () => {
    const own = mediaRecord('draft_eeeeeeeeeeeeeeee')
    const shared = mediaRecord('draft_eeeeeeeeeeeeeeee')
    await putMedia(own)
    await putMedia(shared)
    await claimMedia([shared.id], localOwner('draft_ffffffffffffffff'))
    await releaseOwnerMedia(localOwner('draft_eeeeeeeeeeeeeeee'))
    expect(await getMedia(own.id)).toBeNull()
    expect(await getMedia(shared.id)).not.toBeNull()
  })

})

describe('deleting the original draft never breaks a copy', () => {
  it('an imported draft keeps its images after the original local draft is deleted', async () => {
    const { page, mediaId } = await localDraftWithImage()
    const { api, withCsrf, ana } = signedInApi()
    const result = await importLocalDraft({ withCsrf, userId: ana.id, draftId: page.id })
    expect(result.status).toBe('imported')
    await localDrafts.deleteDraft(page.id)
    expect(await localDrafts.loadDraft(page.id)).toMatchObject({ ok: false, missing: true })
    expect((await getMedia(mediaId)).owners).toEqual([cloudOwner(page.id)])

    renderApp(`/editor/garden-vows?page=${api.state.pages[0].id}`, { api })
    await screen.findByRole('button', { name: 'Save draft' }, { timeout: 6000 })
    await waitFor(() => expect([...document.querySelectorAll('.ed-main img')].some((img) => img.getAttribute('src')?.startsWith('blob:fake'))).toBe(true))
    expect(screen.queryByText(/stored only on the device/)).not.toBeInTheDocument()
  })

  it('a copy imported under a new id keeps its images after the original is deleted', async () => {
    const { page, mediaId } = await localDraftWithImage('Copied guest draft')
    const { withCsrf, ana, api } = signedInApi()
    const copy = await importLocalDraft({ withCsrf, userId: ana.id, draftId: page.id, asCopy: true })
    const copyClientId = api.state.pages[0].clientId
    expect(copy.status).toBe('imported')
    expect(copyClientId).not.toBe(page.id)
    await localDrafts.deleteDraft(page.id)
    expect(await getMedia(mediaId)).toMatchObject({ owners: [cloudOwner(copyClientId)] })
  })

  it('a cloud “save as copy” keeps the images after the original cloud draft is deleted on this device', async () => {
    const { api, ana } = signedInApi()
    const original = createPageFromTemplate(getTemplateBySlug('garden-vows'))
    const record = mediaRecord(original.id, cloudOwner(original.id))
    await putMedia(record)
    const hero = original.sections.find((s) => s.type === 'hero')
    hero.content.image = { alt: 'Ours', mediaId: record.id, original: hero.content.image }
    const draft = api.seedPage(ana, original.id, Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, structuredClone(original[k])])))

    const { user, location } = renderApp(`/editor/garden-vows?page=${draft.id}`, { api })
    await screen.findByRole('button', { name: 'Save draft' }, { timeout: 6000 })
    api.editPageElsewhere(draft.id, (d) => (d.title = 'Changed on phone'))
    const title = within(document.querySelector('.ed-toolbar')).getByLabelText('Page title')
    await user.clear(title)
    await user.type(title, 'Mine')
    await user.click(await screen.findByRole('button', { name: 'Resolve…' }, { timeout: 6000 }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save my version as a new copy' }))
    await waitFor(() => expect(api.state.pages).toHaveLength(2))
    const copy = api.state.pages[1]
    await waitFor(() => expect(location()).toBe(`/editor/garden-vows?page=${copy.id}`))
    expect((await getMedia(record.id)).owners).toEqual([cloudOwner(original.id), cloudOwner(copy.clientId)])

    // The original is deleted from the account on this device: its claim is released, the copy keeps the image.
    await releaseOwnerMedia(cloudOwner(original.id))
    expect((await getMedia(record.id)).owners).toEqual([cloudOwner(copy.clientId)])
  })

  it('removing an image from a copy’s library doesn’t remove it from the original', async () => {
    const record = mediaRecord('draft_gggggggggggggggg')
    await putMedia(record)
    await claimMedia([record.id], cloudOwner('draft_hhhhhhhhhhhhhhhh'))
    await releaseMedia(record.id, cloudOwner('draft_hhhhhhhhhhhhhhhh'))
    expect((await listMedia(localOwner('draft_gggggggggggggggg'))).map((r) => r.id)).toEqual([record.id])
  })
})
