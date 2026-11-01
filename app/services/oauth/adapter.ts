import db from '@adonisjs/lucid/services/db'
import encryption from '@adonisjs/core/services/encryption'
import { createHash } from 'node:crypto'
import { errors, type Adapter, type AdapterPayload } from 'oidc-provider'

export const fingerprint = (input: string) => createHash('sha256').update(input).digest('hex')

/** Token handles are hashed; provider records (including refresh payloads) are encrypted with APP_KEY. */
export default class OAuthAdapter implements Adapter {
  constructor(private model: string) {}
  async upsert(id: string, payload: AdapterPayload, expiresIn?: number) {
    const row = {
      model: this.model,
      key: fingerprint(id),
      payload: encryption.encrypt(payload),
      grant_key: payload.grantId ? fingerprint(payload.grantId) : null,
      uid_key: payload.uid ? fingerprint(payload.uid) : null,
      user_code_key: payload.userCode ? fingerprint(payload.userCode) : null,
      expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    }
    await db.table('mcp_oauth_records').insert(row).onConflict(['model', 'key']).merge(row)
  }
  private async lookup(column: string, value: string) {
    const row = await db
      .from('mcp_oauth_records')
      .where({ model: this.model, [column]: fingerprint(value) })
      .where((q) => q.whereNull('expires_at').orWhere('expires_at', '>', new Date()))
      .first()
    if (!row) return undefined
    const payload = encryption.decrypt<AdapterPayload>(row.payload)
    if (!payload) return undefined
    if (row.consumed_at) payload.consumed = Math.floor(new Date(row.consumed_at).getTime() / 1000)
    return payload
  }
  find(id: string) {
    return this.lookup('key', id)
  }
  findByUid(uid: string) {
    return this.lookup('uid_key', uid)
  }
  findByUserCode(code: string) {
    return this.lookup('user_code_key', code)
  }
  async consume(id: string) {
    const updated = await db
      .from('mcp_oauth_records')
      .where({ model: this.model, key: fingerprint(id) })
      .whereNull('consumed_at')
      .update({ consumed_at: new Date() })
    if (!updated) throw new errors.InvalidGrant('Code or refresh token already consumed')
  }
  async destroy(id: string) {
    await db
      .from('mcp_oauth_records')
      .where({ model: this.model, key: fingerprint(id) })
      .delete()
  }
  async revokeByGrantId(id: string) {
    await db.from('mcp_oauth_records').where('grant_key', fingerprint(id)).delete()
  }
}
