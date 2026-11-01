import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { settingsSchema, EditorialError, type Settings } from './contracts.js'
import { DateTime } from 'luxon'

export async function getSettings(): Promise<Settings> {
  const row = await db.from('editorial_settings').where('id', 1).first()
  return settingsSchema.parse(row?.settings || {})
}
export function readiness(settings: Settings) {
  const missing: string[] = []
  if (!settings.sources.length) missing.push('Sources JSON Feed')
  if (!settings.automation_user_id) missing.push('Compte de préparation')
  if (!settings.notification_label || !env.get('EDITORIAL_NOTIFICATION_URL'))
    missing.push('Destinataire et endpoint de notification')
  if (!env.get('EDITORIAL_GENERATION_URL')) missing.push('Fournisseur de génération')
  return missing
}
export async function saveSettings(input: unknown) {
  const settings = settingsSchema.parse(input)
  if (settings.enabled && readiness(settings).length)
    throw new EditorialError(
      'VALIDATION_FAILED',
      `Configuration incomplète : ${readiness(settings).join(', ')}`
    )
  await db
    .table('editorial_settings')
    .insert({ id: 1, settings: JSON.stringify(settings) })
    .onConflict('id')
    .merge()
  return settings
}
/** DST policy: gap -> shift by the DST jump; fold -> earliest occurrence, exactly once. */
export function scheduleSlots(settings: Settings, now: DateTime = DateTime.utc()) {
  const local = now.setZone(settings.timezone)
  const start = local.startOf('week')
  return [-1, 0, 1]
    .flatMap((week) =>
      settings.slots.map((slot, index) => {
        const date = start
          .plus({ weeks: week, days: slot.weekday - 1 })
          .set({ hour: slot.hour, minute: slot.minute })
        const alternatives = date.getPossibleOffsets()
        const instant = alternatives.sort((a, b) => a.toMillis() - b.toMillis())[0] || date
        return { key: `${date.toISODate()}:${index}`, at: instant.toUTC() }
      })
    )
    .sort((a, b) => a.at.toMillis() - b.at.toMillis())
}
