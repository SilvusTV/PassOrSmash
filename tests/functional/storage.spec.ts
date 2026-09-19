import { test } from '@japa/runner'
import drive from '@adonisjs/drive/services/main'

test.group('Storage', () => {
  test('stores and publicly serves an image from S3', async ({ assert }) => {
    const key = `tests/${Date.now()}.png`
    const image = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8AAAAABJRU5ErkJggg==',
      'base64'
    )

    try {
      await drive.use().put(key, image, { contentType: 'image/png' })
      const url = await drive.use().getUrl(key)
      const response = await fetch(url)

      assert.equal(response.status, 200)
      assert.equal(response.headers.get('content-type'), 'image/png')
    } finally {
      await drive.use().delete(key)
    }
  })
})
