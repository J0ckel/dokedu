import { and, desc, eq, isNotNull } from "drizzle-orm"
import { competences } from "~~/server/database/schema"

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })
  if (user.role !== "admin" && user.role !== "owner" && user.role !== "competence_admin") throw createError({ statusCode: 403, message: "Forbidden" })

  return useDrizzle()
    .select()
    .from(competences)
    .where(and(eq(competences.organisationId, secure.organisationId), isNotNull(competences.deletedAt)))
    .orderBy(desc(competences.deletedAt))
})
