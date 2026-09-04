import { organisations, reports } from "~~/server/database/schema"
import { de } from "date-fns/locale"
import { formatDate } from "date-fns"
import { z } from "zod"
import sharp from "sharp"
import { competences, entries, entryUsers, userCompetences } from "~~/server/database/schema"
import { colors } from "~~/packages/report_generation/utils/color.json"
import { and, eq, inArray, isNull, desc } from "drizzle-orm"
import { typstRenderTemplate } from "~~/server/utils/typst"

const querySchema = z.object({
  updatedAt: z.coerce.date().optional(),
  onlyLearnedCompetences: z.preprocess((value) => {
    if (value === true || value === "true" || value === 1 || value === "1") return true
    if (value === false || value === "false" || value === 0 || value === "0") return false
    return undefined
  }, z.boolean().optional())
})

// Helper function to get hex color from color name and shade
function getHexColor(colorName: string, shade: keyof typeof colors): string {
  const colorShade = colors[shade]
  return colorShade[colorName as keyof typeof colorShade] || colorShade.blue
}

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const id = getRouterParam(event, "id")
  if (!id) throw createError({ statusCode: 404, message: "Not found" })

  const query = await getValidatedQuery(event, querySchema.parse)

  const school = await useDrizzle().query.organisations.findFirst({
    where: and(eq(organisations.id, secure.organisationId))
  })

  const report = await useDrizzle().query.reports.findFirst({
    with: {
      student: true
    },
    where: and(eq(reports.id, id), eq(reports.organisationId, secure.organisationId))
  })
  if (!report) throw createError({ statusCode: 404, message: "Not found" })

  // Fetch competences data if selected in report
  let competencesData: any[] = []
  let entriesData: any[] = []
  const reportContent = report.content as any
  const selectedCompetenceIds = reportContent?.competences || []
  const subjectOrder = reportContent?.subjectOrder ?? {}
  const selectedCompetenceTreeIds = new Set<string>()

  if (selectedCompetenceIds.length > 0) {
    // Fetch all selected competences AND their children (recursively)
    // First, get all selected competences
    const selectedCompetences = await useDrizzle()
      .select()
      .from(competences)
      .where(and(inArray(competences.id, selectedCompetenceIds), eq(competences.organisationId, secure.organisationId), isNull(competences.deletedAt)))

    // Now fetch ALL competences from the organization to build the full tree
    const allCompetences = await useDrizzle()
      .select()
      .from(competences)
      .where(and(eq(competences.organisationId, secure.organisationId), isNull(competences.deletedAt)))

    // Build a set of all competence IDs we need (selected + all their descendants)
    const neededCompetenceIds = new Set<string>()

    // Helper function to recursively add children
    const addChildrenRecursively = (parentId: string) => {
      allCompetences
        .filter((c) => c.competenceId === parentId)
        .forEach((child) => {
          neededCompetenceIds.add(child.id)
          addChildrenRecursively(child.id)
        })
    }

    // Add selected competences and all their children
    selectedCompetenceIds.forEach((id: string) => {
      neededCompetenceIds.add(id)
      addChildrenRecursively(id)
    })
    neededCompetenceIds.forEach((id) => selectedCompetenceTreeIds.add(id))

    const studentGrade = Number(report.student.studentGrade)
    const allGrades = reportContent?.allGrades === true || reportContent?.allGrades === "true" || reportContent?.allGrades === 1 || reportContent?.allGrades === "1"

    // Subjects and groups are just containers; only leaf competences are filtered by grade,
    // so a narrower grade range on a parent group can't hide children that do cover the student's grade.
    const relevantCompetences = allCompetences.filter((c) => {
      if (!neededCompetenceIds.has(c.id)) return false
      if (c.competenceType !== "competence") return true
      const grades = Array.isArray(c.grades) ? c.grades : []
      return allGrades || !studentGrade || grades.includes(studentGrade)
    })

    // Fetch user competence levels for ALL relevant competences
    const userCompetenceLevels = await useDrizzle()
      .select({
        competenceId: userCompetences.competenceId,
        level: userCompetences.level,
        createdAt: userCompetences.createdAt
      })
      .from(userCompetences)
      .where(and(eq(userCompetences.userId, report.studentId), isNull(userCompetences.deletedAt), eq(userCompetences.organisationId, secure.organisationId)))
      .orderBy(desc(userCompetences.createdAt))

    // Create a map of competenceId to latest level
    const competenceLevels = new Map<string, number>()
    const processedCompetences = new Set<string>()

    userCompetenceLevels.forEach((uc) => {
      if (!processedCompetences.has(uc.competenceId)) {
        competenceLevels.set(uc.competenceId, uc.level)
        processedCompetences.add(uc.competenceId)
      }
    })

    const reportContentTyped = report.content as any
    const onlyLearnedFromReport =
      reportContentTyped?.onlyLearnedCompetences === true ||
      reportContentTyped?.onlyLearnedCompetences === "true" ||
      reportContentTyped?.onlyLearnedCompetences === 1 ||
      reportContentTyped?.onlyLearnedCompetences === "1"
    const onlyLearnedCompetencesEnabled = query.onlyLearnedCompetences ?? onlyLearnedFromReport
    // Helper function to build competence tree recursively
    const buildCompetenceTree = (parentId: string | null): any[] => {
      return relevantCompetences
        .filter((c) => c.competenceId === parentId)
        .map((competence) => {
          if (competence.competenceType === "competence") {
            // Leaf node - actual competence
            const level = competenceLevels.get(competence.id) || 0

            if (level < 1) {
              return null
            }

            return {
              id: competence.id,
              name: competence.name,
              level,
              type: "competence",
              sortOrder: competence.sortOrder
            }
          } else {
            // Group node - has children
            const children = buildCompetenceTree(competence.id)

            if (children.length === 0) {
              return null
            }

            return {
              id: competence.id,
              name: competence.name,
              type: "group",
              children,
              sortOrder: competence.sortOrder
            }
          }
        })
        .filter((item) => item !== null)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name))
    }

    // Find all subjects (either directly selected or parents of selected items)
    const subjectIds = new Set<string>()
    selectedCompetences.forEach((comp) => {
      if (comp.competenceType === "subject") {
        subjectIds.add(comp.id)
      } else if (comp.parents && comp.parents.length > 0) {
        // Find the subject parent (first in the parents array)
        subjectIds.add(comp.parents[0])
      }
    })

    // Get all subject competences
    const subjectCompetences = relevantCompetences.filter((c) => c.competenceType === "subject" && subjectIds.has(c.id))

    // Build the final structure starting from subjects
    const subjects = subjectCompetences
      .map((subject) => {
        const children = buildCompetenceTree(subject.id)

        // Flatten the structure for the template (collect all leaf competences)
        const flattenCompetences = (items: any[]): any[] => {
          const result: any[] = []
          items.forEach((item) => {
            if (item.type === "competence") {
              result.push(item)
            } else if (item.children) {
              const childCompetences = flattenCompetences(item.children)
              if (childCompetences.length > 0) {
                result.push(...childCompetences)
              }
            }
          })
          return result
        }

        const flatCompetences = flattenCompetences(children)

        return {
          id: subject.id,
          name: subject.name,
          sortOrder: subject.sortOrder,
          color: getHexColor(subject.color || "blue", "100"),
          color200: getHexColor(subject.color || "blue", "200"),
          color900: getHexColor(subject.color || "blue", "900"),
          competences: flatCompetences
        }
      })
      .filter((subject) => subject.competences.length > 0) // Only include subjects with competences
      .sort((a, b) => (subjectOrder[a.id] ?? a.sortOrder ?? 0) - (subjectOrder[b.id] ?? b.sortOrder ?? 0) || a.name.localeCompare(b.name))

    competencesData = subjects
  }

  if (reportContent?.includeEntries && selectedCompetenceTreeIds.size > 0) {
    const entryRows = await useDrizzle()
      .select({
        entryId: entries.id,
        date: entries.date,
        body: entries.body,
        competenceId: userCompetences.competenceId,
        competenceName: competences.name,
        level: userCompetences.level
      })
      .from(entries)
      .innerJoin(entryUsers, and(eq(entryUsers.entryId, entries.id), eq(entryUsers.userId, report.studentId), isNull(entryUsers.deletedAt)))
      .innerJoin(userCompetences, and(eq(userCompetences.entryId, entries.id), eq(userCompetences.userId, report.studentId), isNull(userCompetences.deletedAt)))
      .innerJoin(competences, and(eq(competences.id, userCompetences.competenceId), isNull(competences.deletedAt)))
      .where(and(eq(entries.organisationId, secure.organisationId), isNull(entries.deletedAt), eq(entryUsers.organisationId, secure.organisationId), inArray(userCompetences.competenceId, [...selectedCompetenceTreeIds])))
      .orderBy(entries.date)

    const entryMap = new Map<string, any>()
    for (const row of entryRows) {
      if (row.level < 1) continue
      const current = entryMap.get(row.entryId) ?? { id: row.entryId, date: formatDate(row.date, "dd.MM.yyyy"), body: row.body, competences: [] }
      current.competences.push({ name: row.competenceName, level: row.level })
      entryMap.set(row.entryId, current)
    }
    entriesData = [...entryMap.values()]
  }

  // Fetch organization logo from storage if it exists
  let processedLogo: Buffer | undefined
  if (school?.logoFileId) {
    const logoBuffer = await useStorage("files").getItemRaw(school.logoFileId)
    if (logoBuffer) {
      // Process the image with sharp to make it square and convert to PNG
      processedLogo = await sharp(logoBuffer)
        .resize(512, 512, {
          fit: "cover",
          position: "center"
        })
        .png()
        .toBuffer()
    }
  }

  // Prepare the template content
  const templateContent = `${TEMPLATE}${competencesData.length > 0 ? "\n\n" + TEMPLATE_COMPETENCES : ""}${entriesData.length > 0 ? "\n\n" + TEMPLATE_ENTRIES : ""}`

  // Prepare the data
  const templateData = {
    student_first_name: report?.student.firstName,
    student_last_name: report?.student.lastName,
    student_birthday: report?.student.studentBirthday,
    student_birthplace: report?.student.studentBirthplace,
    student_grade: report?.student.studentGrade,
    student_birth_date: report?.student.studentBirthday ? formatDate(report.student.studentBirthday, "dd. MMMM yyyy", { locale: de }) : "N/A",
    student_birth_place: report?.student.studentBirthplace ?? "N/A",
    school_year: (report?.content as any)?.schoolYear ?? "N/A",
    student_class: report?.student.studentGrade,
    description: (report?.content as any)?.introduction ?? "N/A",
    school_name: school?.name ?? "N/A",
    has_logo: !!school?.logoFileId,
    show_cover_page: (report?.content as any)?.showCoverPage ?? true,
    cover_header_size: (report?.content as any)?.coverHeaderSize ?? "normal",
    report_font_size: (report?.content as any)?.reportFontSize === "small" ? 9 : (report?.content as any)?.reportFontSize === "large" ? 13 : 11,
    report_layout: (report?.content as any)?.reportLayout ?? "standard",
    competences: competencesData,
    entries: entriesData
  }

  let pdfBuffer: Buffer
  try {
    // Render the PDF using the utility function
    pdfBuffer = await typstRenderTemplate(templateContent, templateData, {
      logo: processedLogo
    })
  } catch (error: any) {
    console.error("[REPORT_PREVIEW] Failed to render PDF", error)
    throw createError({
      statusCode: 500,
      message: `PDF rendering failed: ${error?.message ?? "Unknown Typst error"}`
    })
  }

  setHeader(event, "Content-Type", "application/pdf")
  setHeader(event, "Content-Length", pdfBuffer.byteLength.toString())
  setHeader(event, "Content-Disposition", "inline; filename=report-preview.pdf")
  return pdfBuffer
})

const TEMPLATE = `#let data = json("data.json")

#let first_name = data.student_first_name
//#let middle_name = data.student_middle_name
#let last_name = data.student_last_name

#let full_name = ""

#let full_name = first_name + " " + last_name

// #if data.student_middle_name == "" {
//   full_name = first_name + " " + last_name
// } else {
//   full_name = first_name + " " + middle_name + " " + last_name
// }

#let school_year = data.school_year
#let student_class = data.student_grade
#let birth_date = data.student_birth_date
#let birth_place = data.student_birth_place

#set text(font: "Inter", lang: "de")

#set page(
paper: "a4",
margin: (
  top: 1.5cm,
  bottom: 1.5cm,
  x: 1.5cm,
),
  footer: context [
    #set text(size: 8pt)
    #grid(
      columns: (1fr, auto),
      align: left,
      [
        Lernstandsbericht für #full_name
      ],
      [
   
        #align(right, [Seite #counter(page).display("1 von 1", both: true)])
      ],
    )
  ]
)

#if data.show_cover_page [
  #if data.cover_header_size == "compact" {
    v(4%)
  } else {
    v(10%)
  }


  #if data.has_logo {
    align(center, image("logo.png", width: if data.cover_header_size == "compact" { 18% } else { 25% }))
  } else {
    align(center, rect(width: 40%, height: 25%, fill: rgb(200, 200, 200)))
  }

  // #show par: set block(above: 1em, below: 1em)
  #v(if data.cover_header_size == "compact" { 0.5em } else { 1em })

  #align(center, text(size: if data.cover_header_size == "compact" { 13pt } else { 16pt }, weight: "medium", data.school_name))

  #align(center, text(size: if data.cover_header_size == "compact" { 10pt } else { 12pt }, weight: "regular", "Ersatzschule in freier Trägerschaft"))

  #show heading: set block(above: if data.cover_header_size == "compact" { 0.8em } else { 1.3em }, below: if data.cover_header_size == "compact" { 0.5em } else { 0.9em })

  #align(center, text(size: if data.cover_header_size == "compact" { 17pt } else { 20pt }, weight: "medium", heading(upper("Lernstandsbericht"))))

  // Remove deprecated syntax - just use set par directly
  #set par(spacing: if data.cover_header_size == "compact" { 0.6em } else { 1em })

  #grid(
    columns: (1fr, 1fr),
    align: center,
    [Schuljahr #school_year],
    [Jahrgang #student_class],
  )

  \

  #align(center, text(size: if data.cover_header_size == "compact" { 12pt } else { 14pt }, weight: "bold", full_name))

  #align(center, text(size: if data.cover_header_size == "compact" { 9pt } else { 10pt }, weight: "regular", [
      geboren am #birth_date in #birth_place
  ]))

  \
]

// Remove deprecated show par: set block syntax
#set par(spacing: 1.25em)
#set text(size: data.report_font_size * 1pt)
#set par(justify: true)



#if data.description != "N/A" and data.description != "" [
  #pagebreak()

  #data.description
]

`

const TEMPLATE_COMPETENCES = `#pagebreak()
#set text(size: data.report_font_size * 0.82pt)

#let count = counter("count")
#let n = 0

#for subject in data.competences [
  #count.step()
  
  #table(
    columns: (1fr, auto),
    inset: 6pt,
    fill: (_, row) => if calc.even(row) { rgb(subject.color) } else { white },
    stroke: rgb(subject.color200),
    align: horizon,
    text(size: data.report_font_size * 0.82pt + 2pt, fill: rgb(subject.color900), [*#subject.name*]), text(size: data.report_font_size * 0.82pt + 2pt, fill: rgb(subject.color900),[*Niveau*]),
    ..subject.competences.map(row => (
      text(fill: rgb(subject.color900),[#row.name]),
      align(center, grid(columns: (auto, auto, auto), gutter: 2pt, inset: 0pt, align: bottom, 
          if row.level >= 1 [
            #rect(width: 4pt, height: 6pt, fill: rgb(subject.color900), radius: 1pt)
          ] else [
            #rect(width: 4pt, height: 6pt, fill: rgb(subject.color200), radius: 1pt)
          ],
          if row.level >= 2 [
            #rect(width: 4pt, height: 10pt, fill: rgb(subject.color900), radius: 1pt)
          ] else [
            #rect(width: 4pt, height: 10pt, fill: rgb(subject.color200), radius: 1pt)
          ],
          if row.level >= 3 [
            #rect(width: 4pt, height: 14pt, fill: rgb(subject.color900), radius: 1pt)
          ] else [
            #rect(width: 4pt, height: 14pt, fill: rgb(subject.color200), radius: 1pt)
          ]
        ))
      ,
      )
    ).flatten(),
  )

  #context [
    #if data.report_layout == "standard" and data.competences.len() > count.get().first() [
      #pagebreak()
    ]
  ]
]`

const TEMPLATE_ENTRIES = `#pagebreak()
#heading(level: 1)[Einträge und zugeordnete Kompetenzen]

#for entry in data.entries [
  #heading(level: 2)[#entry.date]
  #if entry.body != "" [
    #entry.body
  ]

  #set par(spacing: 0.35em)
  #for competence in entry.competences [
    #competence.name - Niveau #competence.level \\
  ]

  #v(0.8em)
]`
