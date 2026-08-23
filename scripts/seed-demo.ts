import { and, eq } from "drizzle-orm"
import { entries, entryUsers, organisations, users } from "~~/server/database/schema"
import { useDrizzle } from "~~/server/utils/drizzle"
import { nanoid } from "nanoid"

const demoStudents = [
  {
    firstName: "Mia",
    lastName: "Demo",
    email: "mia.demo@example.test",
    studentGrade: "1",
    studentSex: "female",
    studentBirthday: new Date("2019-04-12"),
    studentJoinedAt: new Date("2025-08-18")
  },
  {
    firstName: "Ben",
    lastName: "Test",
    email: "ben.test@example.test",
    studentGrade: "3",
    studentSex: "male",
    studentBirthday: new Date("2017-11-03"),
    studentJoinedAt: new Date("2024-08-19")
  },
  {
    firstName: "Lea",
    lastName: "Beispiel",
    email: "lea.beispiel@example.test",
    studentGrade: "7",
    studentSex: "female",
    studentBirthday: new Date("2013-06-27"),
    studentJoinedAt: new Date("2023-08-21")
  }
] as const

const demoEntries = [
  { date: "2026-08-18", body: "[Demo] Begruessung und Start ins neue Schuljahr" },
  { date: "2026-08-19", body: "[Demo] Lesestunde: Eine Geschichte zusammenfassen" },
  { date: "2026-08-20", body: "[Demo] Matheuebung: Einmaleins wiederholen" },
  { date: "2026-08-21", body: "[Demo] Gruppenarbeit: Ergebnisse vorstellen" },
  { date: "2026-08-22", body: "[Demo] Wochenreflexion und naechste Lernziele" }
]

const db = useDrizzle()
const [organisation] = await db.select().from(organisations).limit(1)
if (!organisation) throw new Error("No organisation found")

const [creator] = await db
  .select()
  .from(users)
  .where(and(eq(users.organisationId, organisation.id), eq(users.role, "owner")))
  .limit(1)
if (!creator) throw new Error("No owner found")

const studentIds: string[] = []
for (const student of demoStudents) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.organisationId, organisation.id), eq(users.email, student.email)))
    .limit(1)

  if (existing) {
    studentIds.push(existing.id)
    continue
  }

  const [created] = await db
    .insert(users)
    .values({
      id: nanoid(),
      ...student,
      role: "student",
      organisationId: organisation.id,
      password: null
    })
    .returning({ id: users.id })

  studentIds.push(created.id)
}

for (const [index, demoEntry] of demoEntries.entries()) {
  const [existing] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.organisationId, organisation.id), eq(entries.body, demoEntry.body)))
    .limit(1)

  const entryId = existing?.id ?? (await db
    .insert(entries)
    .values({
      id: nanoid(),
      date: new Date(demoEntry.date),
      body: demoEntry.body,
      userId: creator.id,
      organisationId: organisation.id
    })
    .returning({ id: entries.id }))[0].id

  const assignedStudentIds = index % 2 === 0 ? studentIds : studentIds.slice(1)
  for (const studentId of assignedStudentIds) {
    await db.insert(entryUsers).values({
      id: nanoid(),
      entryId,
      userId: studentId,
      organisationId: organisation.id
    }).onConflictDoNothing()
  }
}

console.log(`Demo data ready: ${studentIds.length} students and ${demoEntries.length} entries.`)
