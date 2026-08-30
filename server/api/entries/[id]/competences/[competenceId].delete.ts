import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { userCompetences } from "~~/server/database/schema"

const routeParams = z.object({
  id: z.string(),
  competenceId: z.string()
})

const bodySchema = z
  .object({
    userId: z.string().optional()
  })
  .default({})

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { id, competenceId } = await getValidatedRouterParams(event, routeParams.parse)
  const body = await readBody(event).catch(() => ({}))
  const { userId } = bodySchema.parse(body ?? {})

  await useDrizzle()
    .update(userCompetences)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(userCompetences.organisationId, secure.organisationId),
        eq(userCompetences.competenceId, competenceId),
        eq(userCompetences.entryId, id),
        userId ? eq(userCompetences.userId, userId) : undefined
      )
    )

  return {}
})
