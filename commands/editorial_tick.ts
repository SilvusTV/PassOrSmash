import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import EditorialJobs from '#services/editorial/jobs'

export default class EditorialTick extends BaseCommand {
  static commandName = 'editorial:tick'
  static description = 'Planifie les créneaux éditoriaux et traite une tâche durable.'
  static options: CommandOptions = { startApp: true }
  async run() {
    const jobs = new EditorialJobs()
    await jobs.schedule()
    this.logger.info(
      (await jobs.workOne()) ? 'Tâche éditoriale traitée.' : 'Aucune tâche disponible.'
    )
  }
}
