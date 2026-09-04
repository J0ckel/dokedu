import { asc, eq, isNull } from "drizzle-orm"
import * as tables from "../../database/schema"

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const db = useDrizzle()
  const [eventList, relations, competenceList] = await Promise.all([
    db.select().from(tables.events).where(and(eq(tables.events.organisationId, secure.organisationId), isNull(tables.events.deletedAt))).orderBy(asc(tables.events.title)).limit(1000),
    db.select().from(tables.eventCompetences).where(eq(tables.eventCompetences.organisationId, secure.organisationId)),
    db.select().from(tables.competences).where(and(eq(tables.competences.organisationId, secure.organisationId), isNull(tables.competences.deletedAt)))
  ])

  const competencesById = new Map(competenceList.map((competence) => [competence.id, competence]))

  function subjectName(competence: (typeof competenceList)[number]) {
    let current: (typeof competenceList)[number] | undefined = competence
    const visited = new Set<string>()

    while (current && !visited.has(current.id)) {
      if (current.competenceType === "subject") return current.name
      visited.add(current.id)
      current = current.competenceId ? competencesById.get(current.competenceId) : undefined
    }
  }

  return eventList.map((currentEvent) => {
    const eventCompetences = relations
      .filter((relation) => relation.eventId === currentEvent.id)
      .map((relation) => competencesById.get(relation.competenceId))
      .filter((competence): competence is NonNullable<typeof competence> => Boolean(competence))

    const competences = eventCompetences.map((competence) => {
      return {
        id: competence.id,
        name: competence.name,
        subject: subjectName(competence)
      }
    })
    const subjects = Array.from(new Set(competences.map((competence) => competence.subject).filter((subject): subject is string => Boolean(subject))))

    return { ...currentEvent, competences, subjects }
  })
})
