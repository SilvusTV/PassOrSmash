import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import Playlist from '#models/playlist'
import PlaylistItem from '#models/playlist_item'
import User from '#models/user'
import AdminManagement from '#services/admin/management'
import { AdminError, playlistEditSchema } from '#services/admin/contracts'
import Proposals, { audit, idempotent } from '#services/editorial/proposals'
import EditorialJobs from '#services/editorial/jobs'
import { getSettings, saveSettings, readiness, scheduleSlots } from '#services/editorial/settings'
import NewsTopics from '#services/news/topics'
import {
  type Actor,
  EditorialError,
  contentSchema,
  contentPatchSchema,
  itemPatchSchema,
  id,
  itemSchema,
  key,
  pageSchema,
  provenanceSchema,
  requireScope,
  revision,
  settingsPatchSchema,
} from '#services/editorial/contracts'
export function createEditorialServer(actor: Actor) {
  const server = new McpServer({ name: 'passorsmash-editorial', version: '1.0.0' })
  const proposals = new Proposals()
  const jobs = new EditorialJobs()
  function tool<S extends z.ZodRawShape>(
    name: string,
    description: string,
    scope: string,
    shape: S,
    execute: (input: z.infer<z.ZodObject<S>>) => Promise<unknown>,
    readOnly = false,
    idempotentHint = false
  ) {
    if (!actor.scopes.includes(scope)) return
    const schema = z.strictObject(shape)
    server.registerTool(
      name,
      {
        description,
        inputSchema: schema,
        outputSchema: z.object({ data: z.unknown() }),
        annotations: {
          readOnlyHint: readOnly,
          destructiveHint: !readOnly,
          idempotentHint: readOnly || idempotentHint,
          openWorldHint: [
            'find_news_topics',
            'start_proposal_generation',
            'import_proposal_image',
          ].includes(name),
        },
      },
      async (input) => {
        try {
          requireScope(actor, scope)
          await db.transaction((trx) =>
            audit(trx, actor, 'mcp_tool', undefined, undefined, { tool: name })
          )
          const data = await execute(schema.parse(input))
          return {
            content: [{ type: 'text', text: JSON.stringify(data) }],
            structuredContent: { data },
          }
        } catch (error) {
          const failure =
            error instanceof AdminError
              ? new EditorialError(error.code, error.message)
              : error instanceof EditorialError
                ? error
                : error instanceof z.ZodError
                  ? new EditorialError(
                      'VALIDATION_FAILED',
                      'Entrée ou sortie non conforme au schéma.'
                    )
                  : new EditorialError('PROVIDER_UNAVAILABLE', 'Opération indisponible.', true)
          return {
            isError: true,
            content: [{ type: 'text', text: JSON.stringify(failure.toJSON()) }],
          }
        }
      }
    )
  }
  async function list(
    table: string,
    input: { cursor?: string; limit?: number },
    filters: Record<string, unknown> = {},
    category?: string
  ) {
    const limit = input.limit || 25
    const query = db
      .from(table)
      .where('user_id', actor.userId)
      .where(filters)
      .orderBy('id')
      .limit(limit + 1)
    if (input.cursor) query.where('id', '>', input.cursor)
    if (category) query.whereRaw("content->>'category' = ?", [category])
    const rows = await query
    return {
      rows: rows.slice(0, limit),
      next_cursor: rows.length > limit ? rows[limit - 1].id : null,
    }
  }
  const proposalInput = { proposal_id: id, expected_revision: revision }
  tool(
    'get_editorial_status',
    'État de la planification, configuration manquante et compteurs du périmètre autorisé.',
    'editorial:read',
    {},
    async () => {
      const settings = await getSettings()
      const pending = await db
        .from('editorial_proposals')
        .where('user_id', actor.userId)
        .whereNot('status', 'published')
        .count('* as total')
        .first()
      return {
        enabled: settings.enabled,
        next_slot: scheduleSlots(settings)
          .find((slot) => slot.at.toMillis() > Date.now())
          ?.at.toISO(),
        last_run: await db
          .from('editorial_jobs')
          .where('user_id', actor.userId)
          .where('kind', 'generation')
          .orderBy('created_at', 'desc')
          .select('id', 'status', 'created_at', 'error')
          .first(),
        pending: Number(pending?.total || 0),
        capabilities: actor.scopes,
        missing_configuration: readiness(settings),
      }
    },
    true
  )
  tool(
    'list_playlists',
    'Liste paginée des playlists publiques ou appartenant au compte autorisé.',
    'editorial:read',
    {
      cursor: z.number().int().positive().optional(),
      limit: pageSchema.limit,
      search: z.string().max(120).optional(),
    },
    async (input) => {
      const query = Playlist.query()
        .where((q) => q.where('is_public', true).orWhere('user_id', actor.userId))
        .orderBy('id')
        .limit(input.limit + 1)
      if (input.cursor) query.where('id', '>', input.cursor)
      if (input.search) query.whereILike('title', `%${input.search.replace(/[%_]/g, '\\$&')}%`)
      const rows = await query
      return {
        items: rows.slice(0, input.limit).map((row) => ({
          id: row.id,
          title: row.title,
          slug: row.slug,
          description: row.description,
          is_public: row.isPublic,
        })),
        next_cursor: rows.length > input.limit ? rows[input.limit - 1].id : null,
      }
    },
    true
  )
  tool(
    'get_playlist',
    'Contenu d’une playlist accessible ; aucune modification.',
    'editorial:read',
    { playlist_id: z.number().int().positive() },
    async ({ playlist_id }) => {
      const playlist = await Playlist.find(playlist_id)
      if (!playlist || (!playlist.isPublic && playlist.userId !== actor.userId))
        throw new EditorialError('NOT_FOUND', 'Playlist introuvable.')
      const items = await PlaylistItem.query().where('playlist_id', playlist_id).orderBy('position')
      return {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        ...(playlist.userId === actor.userId
          ? {
              edit: await new AdminManagement().playlist(
                await User.findOrFail(actor.userId),
                playlist_id
              ),
            }
          : {}),
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          image_url: item.imageUrl,
        })),
      }
    },
    true
  )
  tool(
    'create_playlist',
    'Crée une playlist appartenant au compte connecté. Privée par défaut ; public la publie immédiatement. Fournir 2 à 100 éléments avec leurs URL d’image. Une même idempotency_key ne crée jamais de doublon.',
    'editorial:write',
    {
      title: playlistEditSchema.shape.title,
      description: z.string().trim().max(600).default(''),
      visibility: z.enum(['public', 'private']).default('private'),
      accent: z.enum(['lime', 'violet', 'coral', 'sky']).default('lime'),
      items: z
        .array(
          playlistEditSchema.shape.items.element
            .omit({ id: true })
            .extend({ description: z.string().trim().max(500).default('') })
        )
        .min(2)
        .max(100),
      idempotency_key: key,
    },
    async ({ idempotency_key, ...input }) => {
      const result = await idempotent(
        actor,
        'create_playlist',
        idempotency_key,
        input,
        async (trx) => {
          // Private editorial media must go through the proposal review workflow.
          if (input.items.some((item) => item.image_url.startsWith('/')))
            throw new EditorialError(
              'VALIDATION_FAILED',
              'Utilisez une URL d’image publique ou le parcours des propositions éditoriales.'
            )
          const [playlist] = await trx
            .table('playlists')
            .insert({
              user_id: actor.userId,
              slug: `selection-${randomUUID()}`,
              title: input.title,
              description: input.description || null,
              is_public: input.visibility === 'public',
              accent: input.accent,
              created_at: new Date(),
              updated_at: new Date(),
            })
            .returning('id')
          await trx.table('playlist_items').multiInsert(
            input.items.map((item, position) => ({
              playlist_id: playlist.id,
              title: item.title,
              description: item.description || null,
              image_url: item.image_url,
              position,
              created_at: new Date(),
              updated_at: new Date(),
            }))
          )
          await audit(trx, actor, 'create_playlist', undefined, undefined, {
            playlist_id: playlist.id,
          })
          return { playlist_id: playlist.id }
        }
      )
      return new AdminManagement().playlist(await User.findOrFail(actor.userId), result.playlist_id)
    },
    false,
    true
  )
  tool(
    'update_playlist',
    'Modifie une playlist existante appartenant au compte connecté. Lire get_playlist et utiliser edit.revision avant toute écriture. Fournir tous les éléments dans leur ordre final : conserver leurs IDs préserve leurs votes ; omettre un élément supprime cet élément et ses votes. Sans ID, un élément est ajouté. Le propriétaire et le lien restent inchangés. La visibilité public publie immédiatement la playlist.',
    'editorial:write',
    {
      playlist_id: z.number().int().positive(),
      ...playlistEditSchema.shape,
    },
    async ({ playlist_id, ...input }) => {
      const playlist = await Playlist.find(playlist_id)
      if (!playlist || playlist.userId !== actor.userId)
        throw new EditorialError(
          'NOT_FOUND',
          'Playlist introuvable ou non modifiable par ce compte.'
        )
      const user = await User.findOrFail(actor.userId)
      const management = new AdminManagement()
      await management.updatePlaylist(user, playlist_id, input)
      return management.playlist(user, playlist_id)
    }
  )
  tool(
    'list_proposals',
    'Résumés paginés des propositions appartenant au compte autorisé.',
    'editorial:read',
    {
      ...pageSchema,
      status: z.enum(['draft', 'in_review', 'rejected', 'published']).optional(),
      category: z.string().max(60).optional(),
    },
    async (input) => {
      const page = await list(
        'editorial_proposals',
        input,
        input.status ? { status: input.status } : {},
        input.category
      )
      return {
        items: page.rows.map((row) => ({
          id: row.id,
          title: row.content.title,
          category: row.content.category,
          status: row.status,
          revision: row.revision,
          created_at: row.created_at,
        })),
        next_cursor: page.next_cursor,
      }
    },
    true
  )
  tool(
    'get_proposal',
    'Sélection complète, images, révision et lien public. Lire avant de modifier.',
    'editorial:read',
    { proposal_id: id },
    async ({ proposal_id }) => {
      const proposal = await proposals.get(actor, proposal_id)
      const mediaIds = proposal.content.items.flatMap((item: { media_id?: string }) =>
        item.media_id ? [item.media_id] : []
      )
      const media = mediaIds.length
        ? await db
            .from('editorial_media')
            .where('user_id', actor.userId)
            .whereIn('id', mediaIds)
            .select('id', 'path', 'width', 'height', 'provenance')
        : []
      return {
        id: proposal.id,
        status: proposal.status,
        revision: proposal.revision,
        content: proposal.content,
        media,
        preview_url: proposal.preview_url,
        public_url: proposal.public_url,
      }
    },
    true
  )
  tool(
    'find_news_topics',
    'Recherche dans les sources JSON Feed autorisées, excluant les sujets proposés récemment.',
    'editorial:generate',
    {
      categories: z.array(z.string().max(60)).max(20).optional(),
      freshness_days: z.number().int().min(1).max(30).optional(),
      limit: z.number().int().min(1).max(50).default(10),
    },
    async (input) =>
      new NewsTopics().find(actor, input.categories, input.freshness_days, input.limit),
    true
  )
  tool(
    'start_proposal_generation',
    'Planifie une préparation durable ; retourne immédiatement job_id. Le sujet doit correspondre à une actualité vérifiée.',
    'editorial:generate',
    {
      topic: z.string().min(1).max(200).optional(),
      candidate_id: z.string().length(64).optional(),
      category: z.string().max(60),
      item_count: z.number().int().min(2).max(30).default(8),
      idempotency_key: key,
    },
    async (input) => {
      if (!input.topic && !input.candidate_id)
        throw new EditorialError('VALIDATION_FAILED', 'Sujet ou candidat requis.')
      const { idempotency_key: idempotencyKey, ...payload } = input
      return jobs.enqueue(actor, 'generation', payload, idempotencyKey)
    },
    false,
    true
  )
  tool(
    'get_job',
    'État durable, résultat et erreur d’une tâche appartenant au compte autorisé.',
    'editorial:read',
    { job_id: id },
    async ({ job_id }) => {
      const job = await db
        .from('editorial_jobs')
        .where({ id: job_id, user_id: actor.userId })
        .select(
          'id',
          'kind',
          'status',
          'stage',
          'attempts',
          'result',
          'error',
          'created_at',
          'updated_at'
        )
        .first()
      if (!job) throw new EditorialError('NOT_FOUND', 'Tâche introuvable.')
      return job
    },
    true
  )
  tool(
    'create_proposal',
    'Crée une sélection avec ses éléments, URL d’image et crédits facultatifs. publish=true la publie directement, sinon elle reste en brouillon.',
    'editorial:write',
    { content: contentSchema, publish: z.boolean().default(false), idempotency_key: key },
    async ({ content, publish, idempotency_key }) => {
      const created = await proposals.create(actor, content, idempotency_key)
      return publish ? proposals.publish(actor, created.proposal_id, created.revision) : created
    },
    false,
    true
  )
  tool(
    'update_proposal',
    'Modifie les champs fournis à la révision attendue. Si la sélection est en ligne, la mise à jour est immédiate.',
    'editorial:write',
    { ...proposalInput, fields: contentPatchSchema },
    async ({ proposal_id, expected_revision, fields }) =>
      proposals.mutate(actor, proposal_id, expected_revision, 'update', (content) => ({
        ...content,
        ...fields,
      }))
  )
  tool(
    'add_proposal_item',
    'Ajoute un élément au brouillon ; renvoie sa nouvelle révision.',
    'editorial:write',
    { ...proposalInput, item: itemSchema.omit({ id: true }), idempotency_key: key },
    async ({ proposal_id, expected_revision, item, idempotency_key }) =>
      idempotent(
        actor,
        'add_proposal_item',
        idempotency_key,
        { proposal_id, expected_revision, item },
        (trx) =>
          proposals.mutate(
            actor,
            proposal_id,
            expected_revision,
            'add_item',
            (content) => ({
              ...content,
              items: [...content.items, { ...item, id: randomUUID() }],
            }),
            trx
          )
      ),
    false,
    true
  )
  tool(
    'update_proposal_item',
    'Modifie un élément existant sans changer son identifiant.',
    'editorial:write',
    { ...proposalInput, item_id: id, fields: itemPatchSchema },
    async ({ proposal_id, expected_revision, item_id, fields }) =>
      proposals.mutate(actor, proposal_id, expected_revision, 'update_item', (content) => {
        const item = content.items.find((entry) => entry.id === item_id)
        if (!item) throw new EditorialError('NOT_FOUND', 'Élément introuvable.')
        Object.assign(item, fields)
        return content
      })
  )
  tool(
    'remove_proposal_item',
    'Retire un élément du brouillon sans supprimer son média.',
    'editorial:write',
    { ...proposalInput, item_id: id },
    async ({ proposal_id, expected_revision, item_id }) =>
      proposals.mutate(actor, proposal_id, expected_revision, 'remove_item', (content) => {
        if (!content.items.some((item) => item.id === item_id))
          throw new EditorialError('NOT_FOUND', 'Élément introuvable.')
        return { ...content, items: content.items.filter((item) => item.id !== item_id) }
      })
  )
  tool(
    'reorder_proposal_items',
    'Réordonne tous les éléments ; la liste complète sans doublons est obligatoire.',
    'editorial:write',
    { ...proposalInput, item_ids: z.array(id).max(100) },
    async ({ proposal_id, expected_revision, item_ids }) =>
      proposals.mutate(actor, proposal_id, expected_revision, 'reorder_items', (content) => {
        if (
          item_ids.length !== content.items.length ||
          new Set(item_ids).size !== item_ids.length ||
          item_ids.some((itemId) => !content.items.some((item) => item.id === itemId))
        )
          throw new EditorialError('VALIDATION_FAILED', 'Liste d’éléments incomplète ou dupliquée.')
        return {
          ...content,
          items: item_ids.map((itemId) => content.items.find((item) => item.id === itemId)!),
        }
      })
  )
  tool(
    'import_proposal_image',
    'Associe directement une URL d’image à un élément, sans téléchargement. Crédit facultatif. Pour un fichier ou retirer une image, utiliser set_proposal_image.',
    'editorial:write',
    { ...proposalInput, item_id: id, provenance: provenanceSchema, idempotency_key: key },
    async ({ idempotency_key, proposal_id, expected_revision, item_id, provenance }) =>
      idempotent(
        actor,
        'link_proposal_image',
        idempotency_key,
        { proposal_id, expected_revision, item_id, provenance },
        (trx) =>
          proposals.setImage(
            actor,
            proposal_id,
            expected_revision,
            item_id,
            { url: provenance.url, credit: provenance.credit },
            trx
          )
      ),
    false,
    true
  )
  tool(
    'save_proposal',
    'Enregistre tout le contenu en une action : titre, descriptions, catégorie et liste des éléments dans leur ordre final. Conserver les IDs existants ; sans ID, un élément est ajouté. Les sources et crédits sont facultatifs. publish=true enregistre et publie atomiquement. Sur une sélection en ligne, les changements sont publiés immédiatement.',
    'editorial:write',
    { ...proposalInput, content: contentSchema, publish: z.boolean().default(false) },
    async ({ proposal_id, expected_revision, content, publish }) =>
      db.transaction(async (trx) => {
        const saved = await proposals.mutate(
          actor,
          proposal_id,
          expected_revision,
          'save',
          () => content,
          trx
        )
        return publish ? proposals.publish(actor, proposal_id, saved.revision, trx) : saved
      })
  )
  tool(
    'set_proposal_image',
    'Définit l’image d’un élément : url pour un lien direct (sans téléchargement), ou data_base64 pour importer un fichier JPG/PNG/WebP/GIF de 8 Mo maximum. Sans les deux, retire l’image. Crédit facultatif.',
    'editorial:write',
    {
      ...proposalInput,
      item_id: id,
      url: z
        .url({ protocol: /^https?$/ })
        .max(2048)
        .optional(),
      data_base64: z.string().min(1).max(11_184_812).optional(),
      credit: z.string().trim().max(500).optional(),
    },
    async ({ proposal_id, expected_revision, item_id, ...image }) => {
      if (image.url && image.data_base64)
        throw new EditorialError('VALIDATION_FAILED', 'Choisissez un lien ou un fichier.')
      return proposals.setImage(actor, proposal_id, expected_revision, item_id, image)
    }
  )
  tool(
    'publish_proposal',
    'Publie directement une sélection. Seuls un titre, deux éléments et leurs images sont nécessaires ; aucune revue ni source obligatoire.',
    'editorial:write',
    proposalInput,
    async ({ proposal_id, expected_revision }) =>
      proposals.publish(actor, proposal_id, expected_revision),
    false,
    true
  )
  tool(
    'unpublish_proposal',
    'Retire une sélection du site et la repasse en brouillon pour la modifier. Conserve la playlist, son lien et ses votes.',
    'editorial:write',
    proposalInput,
    async ({ proposal_id, expected_revision }) =>
      proposals.unpublish(actor, proposal_id, expected_revision)
  )
  tool(
    'delete_proposal',
    'Supprime définitivement une sélection et sa playlist éventuelle, y compris ses votes. Demander uniquement pour une suppression souhaitée.',
    'editorial:write',
    proposalInput,
    async ({ proposal_id, expected_revision }) =>
      proposals.remove(actor, proposal_id, expected_revision)
  )
  tool(
    'retry_editorial_job',
    'Relance une tâche échouée appartenant au compte connecté.',
    'editorial:write',
    { job_id: id },
    async ({ job_id }) => jobs.retry(actor, job_id)
  )
  tool(
    'update_editorial_settings',
    'Modifie les réglages fournis de la préparation automatique. Aucun changement nécessaire pour créer ou publier manuellement.',
    'editorial:write',
    { fields: settingsPatchSchema },
    async ({ fields }) => {
      const current = await getSettings()
      const saved = await saveSettings({
        ...current,
        ...fields,
        automation_user_id: fields.automation_user_id ?? current.automation_user_id ?? actor.userId,
      })
      return { ...saved, notification_label: undefined }
    }
  )
  tool(
    'validate_proposal',
    'Indique uniquement les éléments nécessaires à la publication : au moins deux éléments et une image pour chacun.',
    'editorial:read',
    proposalInput,
    async ({ proposal_id, expected_revision }) =>
      proposals.validate(actor, proposal_id, expected_revision),
    true
  )
  tool(
    'list_editorial_runs',
    'Historique paginé des préparations, avec états et erreurs exploitables.',
    'editorial:read',
    {
      ...pageSchema,
      status: z
        .enum(['queued', 'running', 'succeeded', 'no_topic', 'failed', 'cancelled'])
        .optional(),
      from: z.iso.datetime({ offset: true }).optional(),
      to: z.iso.datetime({ offset: true }).optional(),
    },
    async (input) => {
      const query = db
        .from('editorial_jobs')
        .where({ user_id: actor.userId, kind: 'generation' })
        .orderBy('id')
        .limit(input.limit + 1)
      if (input.cursor) query.where('id', '>', input.cursor)
      if (input.status) query.where('status', input.status)
      if (input.from) query.where('created_at', '>=', input.from)
      if (input.to) query.where('created_at', '<=', input.to)
      const rows = await query.select(
        'id',
        'status',
        'slot_key',
        'attempts',
        'result',
        'error',
        'created_at',
        'updated_at'
      )
      return {
        items: rows.slice(0, input.limit),
        next_cursor: rows.length > input.limit ? rows[input.limit - 1].id : null,
      }
    },
    true
  )
  tool(
    'get_editorial_settings',
    'Réglages éditoriaux et calendrier en lecture seule, sans secrets ni destinataire personnel.',
    'editorial:read',
    {},
    async () => {
      const settings = await getSettings()
      return {
        enabled: settings.enabled,
        timezone: settings.timezone,
        slots: settings.slots,
        categories: settings.categories,
        sources: settings.sources,
        freshness_days: settings.freshness_days,
        catchup_hours: settings.catchup_hours,
        item_count: settings.item_count,
        daily_job_limit: settings.daily_job_limit,
        daily_budget_cents: settings.daily_budget_cents,
        generation_call_cost_cents: settings.generation_call_cost_cents,
      }
    },
    true
  )
  return server
}
