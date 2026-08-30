import { isNull, desc, asc, and, eq } from "drizzle-orm"
import { competences } from "~~/server/database/schema"
import MiniSearch from "minisearch"
import { z } from "zod"

// const table = "competences"

const querySchema = z.object({
  everything: z.coerce.boolean().optional().default(false),
  search: z.string().optional(),
  competenceId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { search, competenceId, everything } = await getValidatedQuery(event, querySchema.parse)

  // if (everything) {
  //   return useDrizzle()
  //     .select()
  //     .from(competences)
  //     .where(and(eq(competences.organisationId, secure.organisationId), isNull(competences.deletedAt)))
  // }

  let parent = null
  if (competenceId) {
    parent = await useDrizzle().query.competences.findFirst({
      where: and(eq(competences.id, competenceId), eq(competences.organisationId, secure.organisationId))
    })

    if (!parent) {
      return []
    }
  }

  let result
  let subjectNames = new Map<string, string>()
  let groupNames = new Map<string, string>()

  if (search) {
    const allCompetences = await useDrizzle()
      .select()
      .from(competences)
      .where(and(isNull(competences.deletedAt), eq(competences.organisationId, secure.organisationId)))

    let scopedCompetences = allCompetences
    if (competenceId) {
      const descendantIds = new Set([competenceId])
      let changed = true

      while (changed) {
        changed = false
        for (const competence of allCompetences) {
          if (competence.competenceId && descendantIds.has(competence.competenceId) && !descendantIds.has(competence.id)) {
            descendantIds.add(competence.id)
            changed = true
          }
        }
      }

      scopedCompetences = allCompetences.filter((competence) => competence.id !== competenceId && competence.competenceId && descendantIds.has(competence.id))
    }

    const competenceById = new Map(allCompetences.map((competence) => [competence.id, competence]))
    for (const competence of allCompetences) {
      let current = competence
      const visited = new Set<string>()

      while (current && !visited.has(current.id)) {
        if (current.id !== competence.id && current.competenceType === "group" && !groupNames.has(competence.id)) {
          groupNames.set(competence.id, current.name)
        }
        if (current.competenceType === "subject") {
          subjectNames.set(competence.id, current.name)
          break
        }

        visited.add(current.id)
        current = current.competenceId ? competenceById.get(current.competenceId) : undefined
      }
    }

    result = scopedCompetences
      .sort((first, second) => {
        if (first.competenceType !== second.competenceType) return first.competenceType < second.competenceType ? 1 : -1
        return first.name.localeCompare(second.name)
      })
      .slice(0, 2500)
  } else {
    result = await useDrizzle()
      .select()
      .from(competences)
      .where(
        and(
          competenceId ? eq(competences.competenceId, competenceId) : isNull(competences.competenceId),
          isNull(competences.deletedAt),
          eq(competences.organisationId, secure.organisationId)
        )
      )
      .orderBy(desc(competences.competenceType), asc(competences.name))
      .limit(2500)
  }

  if (search) {
    let miniSearch = new MiniSearch({
      fields: ["name"], // fields to index for full-text search
      storeFields: ["id", "name"], // fields to return with search results
      searchOptions: {
        fuzzy: 0.49
      }
    })

    // Index all documents
    miniSearch.addAll(result)

    // Search with default options
    let results = miniSearch.search(search)

    const items = result.filter((c) => results.find((el) => el.id === c.id))

    // .orderBy(desc(competences.competenceType), asc(competences.name))
    return items.slice(0, 100).map((competence) => ({
      ...competence,
      subjectName: subjectNames.get(competence.id),
      groupName: groupNames.get(competence.id)
    }))
  } else {
    return result.slice(0, 100)
  }
})
