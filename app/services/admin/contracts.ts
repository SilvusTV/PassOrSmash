import { z } from 'zod'

export class AdminError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message)
  }
}
export const entityId = z.coerce.number().int().positive()
export const filtersSchema = z.strictObject({
  q: z.string().trim().max(120).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.enum(['all', 'active', 'suspended']).default('all'),
})
export const playlistFiltersSchema = z.strictObject({
  q: z.string().trim().max(120).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  visibility: z.enum(['all', 'public', 'private']).default('all'),
  user_id: entityId.optional(),
})
export const versionSchema = z.string().regex(/^[a-f0-9]{64}$/)
const description = (maximum: number) =>
  z.preprocess((value) => (value === null ? '' : value), z.string().trim().max(maximum))
export const playlistEditSchema = z.strictObject({
  expected_revision: versionSchema,
  title: z.string().trim().min(3).max(120),
  description: description(600),
  visibility: z.enum(['public', 'private']),
  accent: z.enum(['lime', 'violet', 'coral', 'sky']),
  items: z
    .array(
      z.strictObject({
        id: z.number().int().positive().optional(),
        title: z.string().trim().min(1).max(120),
        description: description(500),
        image_url: z
          .string()
          .max(2048)
          .refine((value) => {
            if (/^\/editorial\/media\/[a-f0-9-]{36}$/.test(value)) return true
            try {
              return ['http:', 'https:'].includes(new URL(value).protocol)
            } catch {
              return false
            }
          }, 'URL d’image invalide.'),
      })
    )
    .min(2)
    .max(100),
})
export type PlaylistEdit = z.infer<typeof playlistEditSchema>
export const suspensionSchema = z.strictObject({
  suspended: z.boolean(),
  expected_suspended: z.boolean(),
  reason: z.string().trim().min(3).max(500),
})
export const deletePlaylistSchema = z.strictObject({
  expected_revision: versionSchema,
  confirm_slug: z.string().min(1).max(120),
})
