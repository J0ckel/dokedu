import { sessions, users } from "../../database/schema"
import { isNull, ne } from "drizzle-orm"
import { z } from "zod"

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
})

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { currentPassword, newPassword } = await readValidatedBody(event, bodySchema.parse)

  const [dbUser] = await useDrizzle().select().from(users).where(eq(users.id, user.id)).limit(1)
  if (!dbUser?.password) throw createError({ statusCode: 401, message: "Bad credentials" })

  const isMatch = await verifyPassword(dbUser.password, currentPassword)
  if (!isMatch) throw createError({ statusCode: 401, message: "Bad credentials" })

  const hashedPassword = await hashPassword(newPassword)

  await useDrizzle().update(users).set({ password: hashedPassword }).where(eq(users.id, user.id))

  // Soft delete all other active sessions for the user
  await useDrizzle()
    .update(sessions)
    .set({ deletedAt: new Date() })
    .where(and(ne(sessions.token, secure.token), eq(sessions.userId, user.id), isNull(sessions.deletedAt)))

  return {}
})
