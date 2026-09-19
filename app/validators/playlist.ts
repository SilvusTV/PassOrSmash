import vine from '@vinejs/vine'

/**
 * Validator to validate the payload when creating
 * a new playlist.
 */
export const createPlaylistValidator = vine.create({
  title: vine.string().trim().minLength(3).maxLength(120),
  description: vine.string().trim().maxLength(600).optional(),
  visibility: vine.enum(['public', 'private']),
  accent: vine.enum(['lime', 'violet', 'coral', 'sky']).optional(),
  items: vine
    .array(
      vine.object({
        title: vine.string().trim().minLength(1).maxLength(120),
        description: vine.string().trim().maxLength(500).optional(),
        imageUrl: vine.string().trim().url(),
      })
    )
    .minLength(2)
    .maxLength(100),
})

/**
 * Validator to validate the payload when updating
 * an existing playlist.
 */
export const updatePlaylistValidator = createPlaylistValidator
