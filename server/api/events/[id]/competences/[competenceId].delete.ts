import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { eventCompetences } from "~~/server/database/schema"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })
  const { id, competenceId } = await getValidatedRouterParams(event, (value) => z.object({ id: z.string(), competenceId: z.string() }).parse(value))

  await useDrizzle().delete(eventCompetences).where(and(eq(eventCompetences.eventId, id), eq(eventCompetences.competenceId, competenceId), eq(eventCompetences.organisationId, secure.organisationId)))
  return { success: true }
})