import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { competences, eventCompetences, events } from "~~/server/database/schema"

const bodySchema = z.object({ competenceId: z.string() })

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })
  const { id } = await getValidatedRouterParams(event, (value) => z.object({ id: z.string() }).parse(value))
  const { competenceId } = await readValidatedBody(event, bodySchema.parse)

  const [validEvent, validCompetence] = await Promise.all([
    useDrizzle().query.events.findFirst({ where: and(eq(events.id, id), eq(events.organisationId, secure.organisationId)) }),
    useDrizzle().query.competences.findFirst({ where: and(eq(competences.id, competenceId), eq(competences.organisationId, secure.organisationId), isNull(competences.deletedAt)) })
  ])
  if (!validEvent || !validCompetence) throw createError({ statusCode: 404, message: "Event or competence not found" })

  return useDrizzle().insert(eventCompetences).values({ eventId: id, competenceId, organisationId: secure.organisationId }).onConflictDoNothing().returning()
})