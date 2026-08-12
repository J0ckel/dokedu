import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { competences } from "~~/server/database/schema"

const bodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  competenceType: z.enum(["subject", "group", "competence"]),
  competenceId: z.string().nullable().optional(),
  grades: z.array(z.number().int().min(1).max(13)).min(1).max(13),
  color: z.string().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })
  if (user.role !== "admin" && user.role !== "owner") throw createError({ statusCode: 403, message: "Forbidden" })

  const { id } = await getValidatedRouterParams(event, (value) => z.object({ id: z.string() }).parse(value))
  const body = await readValidatedBody(event, bodySchema.parse)
  if (body.competenceId === id) throw createError({ statusCode: 400, message: "A competence cannot be its own parent" })

  const existing = await useDrizzle().query.competences.findFirst({
    where: and(eq(competences.id, id), eq(competences.organisationId, secure.organisationId), isNull(competences.deletedAt))
  })
  if (!existing) throw createError({ statusCode: 404, message: "Competence not found" })

  const [result] = await useDrizzle().update(competences).set({ ...body, updatedAt: new Date() })
    .where(and(eq(competences.id, id), eq(competences.organisationId, secure.organisationId))).returning()
  return result
})