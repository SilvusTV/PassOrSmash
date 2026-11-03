import { z } from 'zod'
import { randomUUID } from 'node:crypto'

export const scopes = ['editorial:read', 'editorial:write', 'editorial:generate'] as const
export type Actor = { userId: number; identity: string; scopes: string[] }
export const id = z.uuid()
export const revision = z.number().int().positive()
export const key = z.string().min(8).max(120)
export const sourceSchema = z.strictObject({
  title: z.string().min(1).max(200),
  url: z.url({ protocol: /^https$/ }),
  published_at: z.iso.datetime({ offset: true }).optional(),
  retrieved_at: z.iso.datetime({ offset: true }),
})
export const provenanceSchema = z.strictObject({
  url: z.url({ protocol: /^https$/ }),
  credit: z.string().trim().max(500).default(''),
  license: z.enum(['CC0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'permission']).optional(),
  license_url: z.url({ protocol: /^https$/ }).optional(),
})
export const itemSchema = z.strictObject({
  id: id.optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(''),
  media_id: id.optional(),
  image_url: z
    .url({ protocol: /^https?$/ })
    .max(2048)
    .optional(),
  image_credit: z.string().trim().max(500).optional(),
  source_urls: z
    .array(z.url({ protocol: /^https$/ }))
    .max(20)
    .default([]),
})
export const contentSchema = z.strictObject({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(600).default(''),
  category: z.string().trim().min(1).max(60).default('sélection'),
  items: z.array(itemSchema).max(100).default([]),
  sources: z.array(sourceSchema).max(50).default([]),
  checks: z.array(z.string().min(1).max(500)).max(30).default([]),
})
export type Content = z.infer<typeof contentSchema>
export const contentPatchSchema = z.strictObject({
  title: contentSchema.shape.title.optional(),
  description: z.string().trim().max(600).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  sources: z.array(sourceSchema).max(50).optional(),
  checks: z.array(z.string().min(1).max(500)).max(30).optional(),
})
export const itemPatchSchema = z.strictObject({
  title: itemSchema.shape.title.optional(),
  description: z.string().trim().max(500).optional(),
  media_id: id.optional(),
  image_url: z
    .url({ protocol: /^https?$/ })
    .max(2048)
    .optional(),
  image_credit: z.string().trim().max(500).optional(),
  source_urls: z
    .array(z.url({ protocol: /^https$/ }))
    .max(20)
    .optional(),
})
export const pageSchema = {
  cursor: id.optional(),
  limit: z.number().int().min(1).max(50).default(25),
}
export const settingsSchema = z.strictObject({
  enabled: z.boolean().default(false),
  timezone: z.literal('Europe/Paris').default('Europe/Paris'),
  slots: z
    .array(
      z.strictObject({
        weekday: z.number().int().min(1).max(7),
        hour: z.number().int().min(0).max(23),
        minute: z.number().int().min(0).max(59),
      })
    )
    .length(2)
    .refine((v) => JSON.stringify(v[0]) !== JSON.stringify(v[1]), 'Créneaux identiques')
    .default([
      { weekday: 2, hour: 10, minute: 0 },
      { weekday: 5, hour: 10, minute: 0 },
    ]),
  categories: z
    .array(z.string().min(1).max(60))
    .min(1)
    .max(20)
    .default(['jeux', 'œuvres', 'nourriture', 'destinations']),
  sources: z
    .array(
      z.strictObject({
        title: z.string().min(1).max(200),
        url: z.url({ protocol: /^https$/ }),
        category: z.string().min(1).max(60),
      })
    )
    .max(30)
    .default([]),
  freshness_days: z.number().int().min(1).max(30).default(7),
  catchup_hours: z.number().int().min(1).max(72).default(12),
  item_count: z.number().int().min(2).max(30).default(8),
  daily_job_limit: z.number().int().min(1).max(30).default(4),
  daily_budget_cents: z.number().int().min(1).max(10000).default(200),
  generation_call_cost_cents: z.number().int().min(1).max(10000).default(50),
  automation_user_id: z.number().int().positive().optional(),
  notification_label: z.string().max(120).default(''),
})
export const settingsPatchSchema = z.strictObject({
  enabled: z.boolean().optional(),
  timezone: z.literal('Europe/Paris').optional(),
  slots: settingsSchema.shape.slots.removeDefault().optional(),
  categories: settingsSchema.shape.categories.removeDefault().optional(),
  sources: settingsSchema.shape.sources.removeDefault().optional(),
  freshness_days: settingsSchema.shape.freshness_days.removeDefault().optional(),
  catchup_hours: settingsSchema.shape.catchup_hours.removeDefault().optional(),
  item_count: settingsSchema.shape.item_count.removeDefault().optional(),
  daily_job_limit: settingsSchema.shape.daily_job_limit.removeDefault().optional(),
  daily_budget_cents: settingsSchema.shape.daily_budget_cents.removeDefault().optional(),
  generation_call_cost_cents: settingsSchema.shape.generation_call_cost_cents
    .removeDefault()
    .optional(),
  automation_user_id: settingsSchema.shape.automation_user_id,
  notification_label: settingsSchema.shape.notification_label.removeDefault().optional(),
})
export type Settings = z.infer<typeof settingsSchema>
export class EditorialError extends Error {
  tracking_id = randomUUID()
  constructor(
    public code: string,
    message: string,
    public retryable = false
  ) {
    super(message)
  }
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      tracking_id: this.tracking_id,
      retryable: this.retryable,
    }
  }
}
export function requireScope(actor: Actor, scope: string) {
  if (!actor.scopes.includes(scope)) throw new EditorialError('FORBIDDEN', 'Droit insuffisant.')
}
export function assertRevision(current: number, expected: number) {
  if (current !== expected)
    throw new EditorialError('REVISION_CONFLICT', 'La proposition a changé. Rechargez son aperçu.')
}
export function assertDraft(status: string) {
  if (status !== 'draft')
    throw new EditorialError(
      'INVALID_STATE',
      'Retirez cette sélection du site avant de la modifier.'
    )
}
