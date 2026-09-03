import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { competences } from "~~/server/database/schema"
import { syncAncestorGrades } from "~~/server/utils/competenceGrades"

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })
  if (user.role !== "admin" && user.role !== "owner" && user.role !== "competence_admin") throw createError({ statusCode: 403, message: "Forbidden" })

  const { id } = await getValidatedRouterParams(event, (value) => z.object({ id: z.string() }).parse(value))

  const existing = await useDrizzle().query.competences.findFirst({
    where: and(eq(competences.id, id), eq(competences.organisationId, secure.organisationId))
  })
  if (!existing) throw createError({ statusCode: 404, message: "Competence not found" })
  if (!existing.deletedAt) throw createError({ statusCode: 409, message: "Competence is not deleted" })

  if (existing.competenceId) {
    const parent = await useDrizzle().query.competences.findFirst({
      where: and(eq(competences.id, existing.competenceId), eq(competences.organisationId, secure.organisationId), isNull(competences.deletedAt))
    })
    if (!parent) throw createError({ statusCode: 409, message: "Restore the parent competence first" })
  }

  const [result] = await useDrizzle()
    .update(competences)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(competences.id, id), eq(competences.organisationId, secure.organisationId)))
    .returning()

  await syncAncestorGrades(secure.organisationId, result.competenceId)

  return result
})
