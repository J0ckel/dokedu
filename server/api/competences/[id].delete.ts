import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { competences } from "~~/server/database/schema"
import { syncAncestorGrades } from "~~/server/utils/competenceGrades"

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })
  if (user.role !== "admin" && user.role !== "owner" && user.role !== "competence_admin") throw createError({ statusCode: 403, message: "Forbidden" })

  const { id } = await getValidatedRouterParams(event, (value) => z.object({ id: z.string() }).parse(value))
  const children = await useDrizzle().query.competences.findFirst({
    where: and(eq(competences.competenceId, id), eq(competences.organisationId, secure.organisationId), isNull(competences.deletedAt))
  })
  if (children) throw createError({ statusCode: 409, message: "Delete child competences first" })

  const existing = await useDrizzle().query.competences.findFirst({
    where: and(eq(competences.id, id), eq(competences.organisationId, secure.organisationId), isNull(competences.deletedAt))
  })

  const [result] = await useDrizzle().update(competences).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(competences.id, id), eq(competences.organisationId, secure.organisationId), isNull(competences.deletedAt))).returning({ id: competences.id })
  if (!result) throw createError({ statusCode: 404, message: "Competence not found" })

  if (existing?.competenceId) {
    await syncAncestorGrades(secure.organisationId, existing.competenceId)
  }

  return result
})