import { events } from "~~/server/database/schema"
import { z } from "zod"

const eventSchema = z.object({
  title: z.string(),
  body: z.string()
})

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const body = await readValidatedBody(event, eventSchema.parse)

  const [result] = await useDrizzle()
    .insert(events)
    .values({
      title: body.title,
      body: body.body,
      organisationId: secure.organisationId
    })
    .returning()

  return result
})
