import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  assertDraft,
  assertRevision,
  contentSchema,
  contentPatchSchema,
  itemPatchSchema,
  settingsSchema,
} from '#services/editorial/contracts'
import { publicAddress, safeDownload } from '#services/editorial/network'
import { scheduleSlots } from '#services/editorial/settings'
import { createEditorialServer } from '../../app/mcp/server.js'
import { createMcpHandler } from '@modelcontextprotocol/server'

test.group('Editorial contracts', () => {
  test('rejects publication fields and unknown arguments in editorial content', ({ assert }) => {
    assert.isFalse(
      contentSchema.safeParse({ title: 'Sélection', category: 'jeux', is_public: true }).success
    )
    assert.isFalse(
      contentSchema.safeParse({ title: 'Sélection', category: 'jeux', approved_by: 1 }).success
    )
    assert.throws(() => assertDraft('in_review'))
    assert.throws(() => assertRevision(2, 1))
  })
  test('partial edits never fill in defaults for fields not supplied', ({ assert }) => {
    assert.deepEqual(contentPatchSchema.parse({ title: 'Titre modifié' }), {
      title: 'Titre modifié',
    })
    assert.deepEqual(itemPatchSchema.parse({ title: 'Élément modifié' }), {
      title: 'Élément modifié',
    })
  })
  test('rejects internal, mapped, link-local and reserved network destinations', async ({
    assert,
  }) => {
    for (const address of [
      '127.0.0.1',
      '10.0.0.1',
      '172.16.0.1',
      '192.168.0.1',
      '169.254.169.254',
      '::1',
      '::ffff:127.0.0.1',
      'fc00::1',
      'fe80::1',
      '0.0.0.0',
    ])
      assert.isFalse(publicAddress(address), address)
    assert.isTrue(publicAddress('1.1.1.1'))
    await assert.rejects(() => safeDownload('http://example.com/image.png'))
    await assert.rejects(() => safeDownload('https://user:secret@example.com/image.png'))
    await assert.rejects(() => safeDownload('https://example.com:8443/image.png'))
  })
  test('keeps exactly two Paris slots with one occurrence across DST changes', ({ assert }) => {
    const settings = settingsSchema.parse({
      slots: [
        { weekday: 7, hour: 2, minute: 30 },
        { weekday: 3, hour: 10, minute: 0 },
      ],
    })
    const spring = scheduleSlots(settings, DateTime.fromISO('2026-03-29T00:00:00Z')).filter(
      (slot) => slot.key.startsWith('2026-03-29')
    )
    const fall = scheduleSlots(settings, DateTime.fromISO('2026-10-25T00:00:00Z')).filter((slot) =>
      slot.key.startsWith('2026-10-25')
    )
    assert.lengthOf(spring, 1)
    assert.equal(spring[0].at.toISO(), '2026-03-29T01:30:00.000Z')
    assert.lengthOf(fall, 1)
    assert.equal(fall[0].at.toISO(), '2026-10-25T00:30:00.000Z')
    assert.isFalse(settings.enabled)
    assert.isFalse(
      settingsSchema.safeParse({ slots: [settings.slots[0], settings.slots[0]] }).success
    )
  })
  test('SDK discovery exposes scoped tools and never publication capabilities', async ({
    assert,
  }) => {
    for (const scopes of [
      ['editorial:read'],
      ['editorial:read', 'editorial:write', 'editorial:generate'],
    ]) {
      const handler = createMcpHandler(() =>
        createEditorialServer({ userId: 1, identity: 'test', scopes })
      )
      try {
        const response = await handler.fetch(
          new Request('http://localhost/mcp', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'accept': 'application/json, text/event-stream',
              'mcp-protocol-version': '2025-11-25',
            },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
          })
        )
        const raw = await response.text()
        const payload = JSON.parse(
          raw.startsWith('event:') ? raw.split('data: ')[1].split('\n')[0] : raw
        )
        const names = payload.result.tools.map((tool: { name: string }) => tool.name)
        assert.isFalse(names.some((name: string) => /publish|approve|sql|exec/.test(name)))
        assert.equal(names.length, scopes.length === 1 ? 9 : 19)
        assert.equal(names.includes('create_proposal'), scopes.includes('editorial:write'))
      } finally {
        await handler.close()
      }
    }
  })
})
