import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import sharp from 'sharp'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { type Actor, EditorialError, provenanceSchema } from './contracts.js'
import { safeDownload } from './network.js'
export default class EditorialMedia {
  async import(actor: Actor, input: unknown) {
    const provenance = provenanceSchema.parse(input)
    const bytes = await safeDownload(provenance.url, { redirects: 3 })
    return this.upload(actor, bytes, provenance)
  }

  async link(actor: Actor, input: unknown, trx?: TransactionClientContract) {
    const provenance = provenanceSchema.parse(input)
    const id = randomUUID()
    // An empty path identifies a remote image: no local file or download is needed.
    await (trx || db).table('editorial_media').insert({
      id,
      user_id: actor.userId,
      path: '',
      provenance: JSON.stringify(provenance),
      width: 0,
      height: 0,
      created_at: new Date(),
    })
    return { media_id: id }
  }

  async upload(
    actor: Actor,
    bytes: Buffer,
    provenance: { credit: string; url?: string },
    trx?: TransactionClientContract
  ) {
    const image = sharp(bytes, { limitInputPixels: 25_000_000, animated: false })
    const metadata = await image.metadata().catch(() => {
      throw new EditorialError('VALIDATION_FAILED', 'Image invalide (JPG, PNG, WebP ou GIF).')
    })
    if (
      !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format || '') ||
      !metadata.width ||
      !metadata.height ||
      metadata.width < 100 ||
      metadata.height < 100
    )
      throw new EditorialError(
        'VALIDATION_FAILED',
        'Image invalide (JPG, PNG, WebP ou GIF, 100 pixels minimum).'
      )
    const output = await image
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true })
    const id = randomUUID()
    const path = `${id}.png`
    await mkdir(app.tmpPath('editorial'), { recursive: true })
    await writeFile(app.tmpPath('editorial', path), output.data, { flag: 'wx' })
    await (trx || db).table('editorial_media').insert({
      id,
      user_id: actor.userId,
      path,
      provenance: JSON.stringify(provenance),
      width: output.info.width,
      height: output.info.height,
      created_at: new Date(),
    })
    return { media_id: id, width: output.info.width, height: output.info.height, provenance }
  }
}
