import vine from '@vinejs/vine'

export const voteValidator = vine.create({
  itemId: vine.number().positive(),
  choice: vine.enum(['smash', 'pass']),
})
