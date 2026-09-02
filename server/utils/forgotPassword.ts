import { users } from "../database/schema"
import { nanoid } from "nanoid"
import type { H3Event } from "h3"

// Generates a password-setup link for a user (no email involved), used when
// admins/teachers are newly created. The link is shown to the admin to hand
// over to the user directly (chat, in person, etc.), since no mail server is configured.
export async function createPasswordSetupLink(event: H3Event, email: string): Promise<string> {
  const lowerCaseEmail = email.toLowerCase()
  const result = await useDrizzle().select().from(users).where(eq(users.email, lowerCaseEmail)).limit(1)
  if (result.length !== 1) throw createError({ statusCode: 401, message: "Bad credentials" })
  const user = result[0]

  if (!user.email) throw createError({ statusCode: 400, message: "User has no email" })

  const passwordResetToken = nanoid(64)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24)

  // Set the reset password token and expiration date
  await useDrizzle().update(users).set({ resetPasswordToken: passwordResetToken, resetPasswordExpiresAt: expiresAt }).where(eq(users.id, user.id))

  return `${getRequestURL(event).origin}/reset-password?token=${passwordResetToken}`
}
