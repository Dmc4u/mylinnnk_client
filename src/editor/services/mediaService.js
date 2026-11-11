/**
 * Media boundary. Today uploads are processed in the browser and stored in
 * IndexedDB for the guest draft. `remoteMedia.upload` is the future
 * authenticated upload (signed URL / media API) and is unavailable for now.
 */
import { newId } from '../model/page.js'
import { claimMedia, getMedia, listMedia, putMedia, releaseMedia } from '../storage/mediaStore.js'
import { FeatureUnavailableError } from './errors.js'

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const MAX_DIMENSION = 2400

export class UploadError extends Error {}

/** Validates the file and downsizes very large photos so drafts stay light. */
export async function prepareImage(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new UploadError('Please choose a JPEG, PNG or WebP image.')
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError('That image is larger than 15 MB. Please choose a smaller file.')

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new UploadError('That file could not be read as an image.')
  }
  const { width, height } = bitmap
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  if (scale === 1 && file.size <= 3 * 1024 * 1024) {
    bitmap.close?.()
    return { blob: file, width, height }
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86))
  return { blob: blob ?? file, width: canvas.width, height: canvas.height }
}

/**
 * Images in this browser. `owner` is the draft using them ('local:<id>' or
 * 'cloud:<clientId>', see storage/mediaStore.js): removing an image from one
 * draft never deletes it for another draft that uses the same file.
 */
export const localMedia = {
  /** Returns { mediaId, persisted }; persisted=false means "this tab only". */
  async upload(owner, draftId, file) {
    const { blob, width, height } = await prepareImage(file)
    const id = newId('media').toLowerCase()
    const { persisted } = await putMedia({
      id, draftId, owners: [owner], blob, type: blob.type, name: file.name.slice(0, 120), size: blob.size, width, height,
      createdAt: new Date().toISOString(),
    })
    return { mediaId: id, persisted }
  },
  get: getMedia,
  list: listMedia,
  claim: claimMedia,
  /** This draft stops using the image; the file is deleted only if no other draft uses it. */
  remove: (id, owner) => releaseMedia(id, owner),
}

export const remoteMedia = {
  upload() {
    throw new FeatureUnavailableError('media', 'Uploading images to your account is coming soon.')
  },
}
