import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { competences } from "~~/server/database/schema"
import { syncAncestorGrades } from "~~/server/utils/competenceGrades"

const competenceSchema = z.object({
  name: z.string().trim().min(1).max(255),
  competenceType: z.enum(["subject", "group", "competence"]),
  competenceId: z.string().nullable().optional(),
  grades: z.array(z.number().int().min(1).max(13)).min(1).max(13),
  color: z.string().nullable().optional()
})

function assertCanManage(role: string) {
  if (role !== "admin" && role !== "owner") {
    throw createError({ statusCode: 403, message: "Forbidden" })
  }
}

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })
  assertCanManage(user.role)

  const body = await readValidatedBody(event, competenceSchema.parse)
  if (body.competenceId) {
    const parent = await useDrizzle().query.competences.findFirst({
      where: and(eq(competences.id, body.competenceId), eq(competences.organisationId, secure.organisationId), isNull(competences.deletedAt))
    })
    if (!parent) throw createError({ statusCode: 400, message: "Invalid parent competence" })
  }

  const [result] = await useDrizzle().insert(competences).values({
    ...body,
    organisationId: secure.organisationId,
    createdBy: user.id,
    updatedAt: new Date()
  }).returning()

  await syncAncestorGrades(secure.organisationId, body.competenceId)

  return result
})