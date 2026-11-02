import { test } from '@japa/runner'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import type { request } from 'node:https'
import { createPublicResolver } from '#services/editorial/dns'
import { createSafeDownloader } from '#services/editorial/network'

test.group('Editorial image network', () => {
  test('deduplicates simultaneous DNS lookups, caches valid answers and prefers IPv4', async ({
    assert,
  }) => {
    let calls = 0
    const resolve = createPublicResolver(async () => {
      calls++
      return [
        { address: '2606:4700:4700::1111', family: 6 },
        { address: '1.1.1.1', family: 4 },
      ]
    })
    const results = await Promise.all([resolve('images.example'), resolve('images.example')])
    assert.equal(results[0][0].family, 4)
    await resolve('images.example')
    assert.equal(calls, 1)
  })

  test('rejects every mixed private/public DNS answer and never caches failures', async ({
    assert,
  }) => {
    let calls = 0
    const resolve = createPublicResolver(async () => {
      calls++
      return [
        { address: '1.1.1.1', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ]
    })
    await assert.rejects(() => resolve('images.example'), /interdite/)
    await assert.rejects(() => resolve('images.example'), /interdite/)
    assert.equal(calls, 2)
  })

  test('bounds stalled DNS and permits a fresh attempt after failure', async ({ assert }) => {
    let calls = 0
    const resolve = createPublicResolver(async () => {
      if (++calls === 1) return new Promise(() => {})
      return [{ address: '1.1.1.1', family: 4 }]
    }, 10)
    await assert.rejects(() => resolve('images.example'), /Impossible de résoudre/)
    const retried = await resolve('images.example')
    assert.equal(retried[0].address, '1.1.1.1')
  })

  test('handles literal IP addresses without DNS and rejects loopback IPv6', async ({ assert }) => {
    const resolve = createPublicResolver(async () => {
      throw new Error('should not resolve')
    })
    const literal = await resolve('1.1.1.1')
    assert.equal(literal[0].family, 4)
    await assert.rejects(() => resolve('[::1]'), /interdite/)
    await assert.rejects(() => resolve('::ffff:127.0.0.1'), /interdite/)
  })

  function transport(
    replies: {
      status?: number
      location?: string
      body?: string
      aborted?: boolean
      stall?: boolean
    }[]
  ) {
    const urls: string[] = []
    const pins: string[] = []
    const send = ((url: URL, options: any, callback: (res: any) => void) => {
      urls.push(url.href)
      options.lookup(url.hostname, {}, (_error: unknown, address: string) => pins.push(address))
      const req = new EventEmitter() as EventEmitter & {
        end: () => void
        destroy: (error: Error) => void
      }
      req.destroy = (error) => {
        req.emit('error', error)
      }
      req.end = () =>
        queueMicrotask(() => {
          const reply = replies.shift()!
          if (reply.stall) return
          const res = Object.assign(new PassThrough(), {
            statusCode: reply.status || 200,
            headers: { location: reply.location },
          })
          callback(res)
          if (reply.aborted) res.emit('aborted')
          else res.end(reply.body || 'image bytes')
        })
      return req
    }) as unknown as typeof request
    const resolver = createPublicResolver(async (host) => [
      { address: host === 'private.example' ? '127.0.0.1' : '1.1.1.1', family: 4 },
    ])
    return { download: createSafeDownloader(resolver, send), urls, pins }
  }

  test('pins the connection and revalidates HTTPS redirects before following them', async ({
    assert,
  }) => {
    const valid = transport([
      { status: 302, location: 'https://cdn.example/image.png' },
      { body: 'verified' },
    ])
    const bytes = await valid.download('https://images.example/photo', { redirects: 3 })
    assert.equal(bytes.toString(), 'verified')
    assert.lengthOf(valid.urls, 2)
    assert.deepEqual(valid.pins, ['1.1.1.1', '1.1.1.1'])
    for (const location of [
      'https://private.example/image',
      'http://cdn.example/image',
      'https://user:pass@cdn.example/image',
    ]) {
      const invalid = transport([{ status: 302, location }])
      await assert.rejects(() => invalid.download('https://images.example/photo', { redirects: 3 }))
      assert.lengthOf(invalid.urls, 1)
    }
  })

  test('limits redirect loops and keeps POST notifications from following redirects', async ({
    assert,
  }) => {
    const loop = transport(Array.from({ length: 4 }, () => ({ status: 302, location: '/again' })))
    await assert.rejects(
      () => loop.download('https://images.example/photo', { redirects: 3 }),
      /HTTP 302/
    )
    assert.lengthOf(loop.urls, 4)
    const post = transport([{ status: 307, location: 'https://cdn.example/notify' }])
    await assert.rejects(
      () => post.download('https://images.example/notify', { method: 'POST', redirects: 3 }),
      /HTTP 307/
    )
    assert.lengthOf(post.urls, 1)
  })

  test('reports HTTP errors, oversize bodies, truncated streams and request timeouts', async ({
    assert,
  }) => {
    await assert.rejects(
      () => transport([{ status: 429 }]).download('https://images.example/photo'),
      /HTTP 429/
    )
    await assert.rejects(
      () =>
        transport([{ body: 'too large' }]).download('https://images.example/photo', { limit: 2 }),
      /volumineux/
    )
    await assert.rejects(
      () => transport([{ aborted: true }]).download('https://images.example/photo'),
      /interrompu/
    )
    await assert.rejects(
      () => transport([{ stall: true }]).download('https://images.example/photo', { timeout: 10 }),
      /dépassé/
    )
    await assert.rejects(() => transport([]).download('invalid url'), /invalide/)
  })
})
