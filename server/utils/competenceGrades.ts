import { and, eq, isNull } from "drizzle-orm"
import { competences } from "~~/server/database/schema"

type Competence = typeof competences.$inferSelect

// One-off bulk recompute for an entire organisation: walks every subject/group tree bottom-up
// so parent grades match the union of all their descendants, regardless of how out of sync they are.
export async function syncAllCompetenceGrades(organisationId: string) {
  const db = useDrizzle()
  const all = await db.select().from(competences).where(and(eq(competences.organisationId, organisationId), isNull(competences.deletedAt)))

  const byId = new Map<string, Competence>(all.map((competence) => [competence.id, competence]))
  const childrenByParent = new Map<string, Competence[]>()
  for (const competence of all) {
    if (!competence.competenceId) continue
    const siblings = childrenByParent.get(competence.competenceId) ?? []
    siblings.push(competence)
    childrenByParent.set(competence.competenceId, siblings)
  }

  const updates: { id: string; name: string; before: number[]; after: number[] }[] = []

  async function resolve(id: string): Promise<number[]> {
    const node = byId.get(id)!
    if (node.competenceType === "competence") return node.grades ?? []

    const children = childrenByParent.get(id) ?? []
    const gradeSet = new Set<number>()
    for (const child of children) {
      for (const grade of await resolve(child.id)) gradeSet.add(grade)
    }
    const grades = [...gradeSet].sort((first, second) => first - second)

    const unchanged = grades.length === (node.grades?.length ?? 0) && grades.every((grade, index) => grade === node.grades[index])
    if (grades.length > 0 && !unchanged) {
      await db.update(competences).set({ grades, updatedAt: new Date() }).where(eq(competences.id, id))
      updates.push({ id, name: node.name, before: node.grades ?? [], after: grades })
    }

    return grades
  }

  const roots = all.filter((competence) => !competence.competenceId)
  for (const root of roots) {
    await resolve(root.id)
  }

  return updates
}

// Recomputes each ancestor's grades as the union of its direct children's grades, walking up to the root.
export async function syncAncestorGrades(organisationId: string, parentId: string | null | undefined) {
  let currentId = parentId

  while (currentId) {
    const parent = await useDrizzle().query.competences.findFirst({
      where: and(eq(competences.id, currentId), eq(competences.organisationId, organisationId), isNull(competences.deletedAt))
    })
    if (!parent) break

    const children = await useDrizzle().query.competences.findMany({
      where: and(eq(competences.competenceId, currentId), eq(competences.organisationId, organisationId), isNull(competences.deletedAt))
    })

    const gradeSet = new Set<number>()
    for (const child of children) {
      for (const grade of child.grades ?? []) gradeSet.add(grade)
    }
    const grades = [...gradeSet].sort((a, b) => a - b)

    const unchanged = grades.length === parent.grades.length && grades.every((grade, index) => grade === parent.grades[index])

    if (grades.length > 0 && !unchanged) {
      await useDrizzle().update(competences).set({ grades, updatedAt: new Date() }).where(eq(competences.id, currentId))
    }

    currentId = parent.competenceId
  }
}
