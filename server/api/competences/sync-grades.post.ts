import { syncAllCompetenceGrades } from "~~/server/utils/competenceGrades"

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })
  if (user.role !== "admin" && user.role !== "owner") throw createError({ statusCode: 403, message: "Forbidden" })

  const updates = await syncAllCompetenceGrades(secure.organisationId)
  return { updatedCount: updates.length, updates }
})
