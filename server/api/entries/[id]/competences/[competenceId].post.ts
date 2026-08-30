import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { competences, entryUsers, userCompetences } from "~~/server/database/schema"

const routeParams = z.object({
  id: z.string(),
  competenceId: z.string()
})

const bodySchema = z
  .object({
    level: z.coerce.number().min(0).max(3).default(1),
    userId: z.string().optional()
  })
  .default({})

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { id, competenceId } = await getValidatedRouterParams(event, routeParams.parse)
  const { level, userId } = await readValidatedBody(event, bodySchema.parse)

  // check if the competence is part of the organisation
  const competenceExists = await useDrizzle()
    .select({ id: competences.id })
    .from(competences)
    .where(and(eq(competences.id, competenceId), eq(competences.organisationId, secure.organisationId)))
  if (competenceExists.length === 0) throw createError({ statusCode: 404, message: "Competence not found" })

  if (userId) {
    const assignedUser = await useDrizzle()
      .select({ id: entryUsers.userId })
      .from(entryUsers)
      .where(and(eq(entryUsers.entryId, id), eq(entryUsers.userId, userId), eq(entryUsers.organisationId, secure.organisationId)))
      .limit(1)

    if (assignedUser.length === 0) {
      throw createError({ statusCode: 404, message: "User not found in entry" })
    }

    await useDrizzle()
      .insert(userCompetences)
      .values({
        userId: userId,
        competenceId: competenceId,
        entryId: id,
        level: level,
        organisationId: secure.organisationId,
        createdBy: user.id
      })
      .onConflictDoUpdate({
        target: [userCompetences.userId, userCompetences.competenceId, userCompetences.entryId],
        set: {
          level: level,
          deletedAt: null
        }
      })

    return {}
  }

  // get entry users
  const result = await useDrizzle()
    .select({ userId: entryUsers.userId, deletedAt: entryUsers.deletedAt })
    .from(entryUsers)
    .where(
      and(
        eq(entryUsers.entryId, id),
        eq(entryUsers.organisationId, secure.organisationId)
      )
    )

  if (result.length === 0) return {}

  const values = result.map((c) => ({
    userId: c.userId,
    competenceId: competenceId,
    entryId: id,
    level: level,
    organisationId: secure.organisationId,
    deletedAt: c.deletedAt,
    createdBy: user.id
  }))

  await useDrizzle()
    .insert(userCompetences)
    .values(values)
    .onConflictDoUpdate({
      target: [userCompetences.userId, userCompetences.competenceId, userCompetences.entryId],
      set: {
        level: level,
        deletedAt: null
      }
    })

  return {}
})
