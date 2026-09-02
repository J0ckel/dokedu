import { users } from "../../../database/schema"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string()
})

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })
  if (user.role !== "owner" && user.role !== "admin") throw createError({ statusCode: 403, message: "Forbidden" })

  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const targetUser = await useDrizzle().query.users.findFirst({
    columns: { email: true },
    where: and(eq(users.id, id), eq(users.organisationId, secure.organisationId))
  })
  if (!targetUser?.email) throw createError({ statusCode: 400, message: "User has no email" })

  const setupLink = await createPasswordSetupLink(event, targetUser.email)

  return { setupLink }
})
