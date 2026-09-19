import type { HttpContext } from '@adonisjs/core/http'
import drive from '@adonisjs/drive/services/main'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

export default class UploadController {
  async store({ request, response }: HttpContext) {
    const image = request.file('image', {
      size: '8mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    })

    if (!image) {
      return response.badRequest({ error: 'Sélectionne une image à importer.' })
    }

    if (!image.isValid) {
      return response.badRequest({ error: image.errors[0]?.message || 'Image invalide.' })
    }

    const extension = image.extname || 'jpg'
    const key = `playlists/${randomUUID()}.${extension}`
    await drive.use().put(key, await readFile(image.tmpPath!), {
      contentType: image.headers['content-type'],
    })

    return response.created({
      key,
      url: await drive.use().getUrl(key),
    })
  }
}
