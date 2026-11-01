import { z } from 'zod'
import db from '@adonisjs/lucid/services/db'
import { createHash } from 'node:crypto'
import { getSettings } from '#services/editorial/settings'
import { safeDownload } from '#services/editorial/network'
import { type Actor, EditorialError } from '#services/editorial/contracts'

const feedSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        url: z.url(),
        title: z.string().max(200),
        date_published: z.iso.datetime({ offset: true }),
        summary: z.string().max(5000).optional(),
      })
    )
    .max(200),
})
export const topicSchema = z.strictObject({
  id: z.string().length(64),
  title: z.string().min(1).max(200),
  category: z.string().max(60),
  excerpt: z.string().max(5000).optional(),
  source: z.strictObject({
    title: z.string(),
    url: z.url({ protocol: /^https$/ }),
    published_at: z.iso.datetime({ offset: true }),
    retrieved_at: z.iso.datetime({ offset: true }),
  }),
})

export default class NewsTopics {
  async find(actor: Actor, categories?: string[], days?: number, limit = 10) {
    const settings = await getSettings()
    const allowed = settings.categories.filter(
      (category) => !categories || categories.includes(category)
    )
    const recent = await db
      .from('editorial_proposals')
      .where('user_id', actor.userId)
      .where('created_at', '>=', new Date(Date.now() - 30 * 86400000))
      .select('content')
    const used = new Set(
      recent.flatMap((row) => row.content.sources.map((source: { url: string }) => source.url))
    )
    const cutoff = Date.now() - (days || settings.freshness_days) * 86400000
    const topics: z.infer<typeof topicSchema>[] = []
    const deadline = Date.now() + 45000
    for (const source of settings.sources.filter((entry) => allowed.includes(entry.category))) {
      if (Date.now() >= deadline)
        throw new EditorialError(
          'PROVIDER_UNAVAILABLE',
          'Durée maximale de collecte atteinte.',
          true
        )
      const bytes = await safeDownload(source.url, { limit: 1024 * 1024 })
      const feed = feedSchema.parse(JSON.parse(bytes.toString('utf8')))
      for (const item of feed.items) {
        if (
          new URL(item.url).protocol !== 'https:' ||
          used.has(item.url) ||
          Date.parse(item.date_published) < cutoff ||
          Date.parse(item.date_published) > Date.now()
        )
          continue
        topics.push({
          id: createHash('sha256').update(item.url).digest('hex'),
          title: item.title,
          category: source.category,
          excerpt: item.summary,
          source: {
            title: source.title,
            url: item.url,
            published_at: item.date_published,
            retrieved_at: new Date().toISOString(),
          },
        })
      }
    }
    return [...new Map(topics.map((topic) => [topic.id, topic])).values()]
      .sort((a, b) => b.source.published_at.localeCompare(a.source.published_at))
      .slice(0, limit)
  }
}
