import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { competences, eventCompetences, events } from "~~/server/database/schema"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })
  const { id } = await getValidatedRouterParams(event, (value) => z.object({ id: z.string() }).parse(value))

  return useDrizzle()
    .select({ id: eventCompetences.id, competenceId: competences.id, name: competences.name, competenceType: competences.competenceType, grades: competences.grades, color: competences.color })
    .from(eventCompetences)
    .innerJoin(events, eq(events.id, eventCompetences.eventId))
    .innerJoin(competences, eq(competences.id, eventCompetences.competenceId))
    .where(and(eq(eventCompetences.eventId, id), eq(eventCompetences.organisationId, secure.organisationId), eq(events.organisationId, secure.organisationId), isNull(competences.deletedAt)))
})