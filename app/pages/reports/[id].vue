<script setup lang="ts">
import { DownloadIcon, PencilIcon, SquareCheckBigIcon, SquareIcon } from "lucide-vue-next"

const { id } = useRoute().params as { id: string }

const { data: report } = await useFetch(`/api/reports/${id}`)
const { data: competences } = await useFetch(`/api/competences`)

const reportContent = report.value?.content as any
const selectedCompetences = ref<string[]>(reportContent?.competences ?? [])
const subjectOrder = ref<Record<string, number>>(reportContent?.subjectOrder ?? {})
const showCoverPage = ref<boolean>(reportContent?.showCoverPage ?? true)
const coverHeaderSize = ref<"normal" | "compact">(reportContent?.coverHeaderSize ?? "normal")
const reportFontSize = ref<"small" | "normal" | "large">(reportContent?.reportFontSize ?? "normal")
const reportLayout = ref<"standard" | "compact">(reportContent?.reportLayout ?? "standard")
const includeEntries = ref<boolean>(reportContent?.includeEntries ?? false)

const coverHeaderSizeOptions = [
  { value: "normal", display: "Normal" },
  { value: "compact", display: "Kompakt" }
]

const reportFontSizeOptions = [
  { value: "small", display: "Klein" },
  { value: "normal", display: "Normal" },
  { value: "large", display: "Groß" }
]

const reportLayoutOptions = [
  { value: "standard", display: "Standard: jedes Fach beginnt auf einer neuen Seite" },
  { value: "compact", display: "Kompakt: Fächer folgen fortlaufend" }
]

function toggleCompetence(competenceId: string) {
  if (selectedCompetences.value.includes(competenceId)) {
    selectedCompetences.value = selectedCompetences.value.filter((id) => id !== competenceId)
  } else {
    selectedCompetences.value.push(competenceId)
  }
}

function isCompetenceSelected(competenceId: string) {
  return selectedCompetences.value.includes(competenceId)
}

function toggleAllCompetences() {
  if (selectedCompetences.value.length === competences.value?.length) {
    selectedCompetences.value = []
  } else {
    selectedCompetences.value = competences.value?.map((competence) => competence.id) ?? []
  }
}

const firstName = computed(() => report.value?.student.firstName)
const lastName = computed(() => report.value?.student.lastName)
const birthdate = computed(() => (report.value?.student.studentBirthday ? formatDate(report.value?.student.studentBirthday) : ""))
const birthplace = computed(() => report.value?.student.studentBirthplace)

const status = ref(report.value?.status ?? "draft")

const statusOptions = [
  { display: "Entwurf", color: "gray", value: "draft" },
  { display: "In Arbeit", color: "orange", value: "in_progress" },
  { display: "In Prüfung", color: "blue", value: "in_review" },
  { display: "Abgeschlossen", color: "green", value: "completed" }
]

const schoolYear = ref(reportContent?.schoolYear ?? "")

const header = ref(reportContent?.introduction ?? "")

function formatDate(date: string) {
  return Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(Date.parse(date)))
}

let lastHash = ref(new Date().getTime().toString())

// watchDebounced(
//   [selectedCompetences, status, schoolYear, header],
//   async () => {
//     await save()
//     lastHash.value = new Date().getTime().toString()
//   },
//   { debounce: 1000, maxWait: 5_000, deep: true }
// )

async function save() {
  await $fetch(`/api/reports/${id}`, {
    method: "PUT",
    body: {
      status: status.value,
      schoolYear: schoolYear.value,
      introduction: header.value,
      competences: selectedCompetences.value,
      subjectOrder: subjectOrder.value,
      showCoverPage: showCoverPage.value,
      coverHeaderSize: coverHeaderSize.value,
      reportFontSize: reportFontSize.value,
      reportLayout: reportLayout.value,
      includeEntries: includeEntries.value
    }
  })

  lastHash.value = new Date().getTime().toString()
}

async function downloadReport() {
  // Create a link to download the PDF
  const link = document.createElement("a")
  link.href = `/api/reports/${id}/preview?s=${lastHash.value}`
  link.download = `bericht-${report.value?.student.firstName}-${report.value?.student.lastName}.pdf`
  link.target = "_blank"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <DPage>
    <DHeader>
      <DHeaderTitle>Berichte</DHeaderTitle>

      <template #right>
        <DButton :icon-left="DownloadIcon" @click="downloadReport">Herunterladen</DButton>
      </template>
    </DHeader>

    <DPageContent class="!p-0">
      <div class="flex h-full flex-col">
        <div class="grid h-full grid-cols-2 overflow-auto">
          <form class="flex flex-1 flex-col gap-4 overflow-auto px-6 py-4" @submit.prevent="save">
            <div>
              <DLabel class="mb-1">Status</DLabel>
              <DSelect v-model="status" :options="statusOptions" placeholder="Status" />
            </div>

            <div class="flex w-full flex-col gap-2">
              <DToggle v-model="showCoverPage"> Deckblatt anzeigen </DToggle>
            </div>

            <div>
              <DLabel class="mb-1">Kopf des Deckblatts</DLabel>
              <DSelect v-model="coverHeaderSize" :options="coverHeaderSizeOptions" placeholder="Größe des Deckblattkopfs" />
            </div>

            <div>
              <DLabel class="mb-1">Schriftgröße der PDF</DLabel>
              <DSelect v-model="reportFontSize" :options="reportFontSizeOptions" placeholder="Schriftgröße" />
            </div>

            <div>
              <DLabel class="mb-1">Layout der Kompetenzübersicht</DLabel>
              <DSelect v-model="reportLayout" :options="reportLayoutOptions" placeholder="Layout" />
            </div>

            <div class="flex w-full flex-col gap-2">
              <DToggle v-model="includeEntries">Einträge mit Kompetenzen und Niveau ausgeben</DToggle>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="">
                <DLabel class="mb-1">Vorname</DLabel>
                <DInput type="text" v-model="firstName" placeholder="Vorname" class="w-full" disabled />
              </div>

              <div class="">
                <DLabel class="mb-1">Nachname</DLabel>
                <DInput type="text" v-model="lastName" placeholder="Nachname" class="w-full" disabled />
              </div>

              <!-- birthdate -->
              <div class="">
                <DLabel class="mb-1">Geburtstag</DLabel>
                <DInput type="text" v-model="birthdate" placeholder="Geburtstag" class="w-full" disabled />
              </div>

              <!-- birthplace -->
              <div class="">
                <DLabel class="mb-1">Geburtsort</DLabel>
                <DInput type="text" v-model="birthplace" placeholder="Geburtsort" class="w-full" disabled />
              </div>

              <div class="col-span-2 flex flex-col gap-2 rounded bg-blue-100 p-4">
                <div class="text-sm text-blue-900">Dieser Schüler kann nicht hier bearbeitet werden. Bitte bearbeite ihn in den Admin-Einstellungen.</div>
                <DButton variant="primary" :icon-left="PencilIcon" :to="`/settings/students/${id}`" class="w-fit">Bearbeiten</DButton>
              </div>
            </div>

            <div class="">
              <DLabel class="mb-1">Einleitung</DLabel>
              <textarea
                v-model="header"
                placeholder="Schreibe eine Einleitung für den Lernstandsbericht..."
                class="mb-1 field-sizing-content max-h-[60vh] min-h-36 w-full resize-none rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-0 focus:outline-0"
              ></textarea>
            </div>

            <div class="flex w-full flex-col gap-2">
              <div class="flex items-center justify-between">
                <DLabel class="mb-1">Kompetenzen</DLabel>
                <DButton variant="secondary" @click="toggleAllCompetences">
                  Alle Kompetenzen {{ selectedCompetences.length === competences?.length ? "abwählen" : "auswählen" }}
                </DButton>
              </div>
              <div class="rounded-md bg-neutral-100 p-2 text-sm text-neutral-500">
                Für {{ report?.student.firstName }} werden nur Kompetenzen angezeigt, die für die {{ report?.student.studentGrade }}. Klasse vorgesehen sind und mindestens mit Niveau 1 erreicht wurden.
              </div>
              <div class="flex flex-col gap-0.5">
                <div
                  v-for="competence in competences"
                  :key="competence.id"
                  class="flex w-full cursor-default items-center gap-2 rounded-lg p-1 hover:bg-neutral-50"
                  @click="toggleCompetence(competence.id)"
                >
                  <DButton variant="secondary" :icon-left="isCompetenceSelected(competence.id) ? SquareCheckBigIcon : SquareIcon"></DButton>
                  <DTag :color="competence.color" class="h-7">{{ competence.name }}</DTag>
                  <input
                    v-if="isCompetenceSelected(competence.id)"
                    v-model.number="subjectOrder[competence.id]"
                    type="number"
                    min="0"
                    max="9999"
                    placeholder="Reihenfolge"
                    aria-label="Reihenfolge"
                    class="ml-auto w-28 rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    @click.stop
                  />
                </div>
              </div>
            </div>

            <DButton type="submit" class="w-fit">Speichern</DButton>
          </form>
          <iframe :src="`/api/reports/${id}/preview?s=${lastHash}`" class="h-full w-full bg-black p-2" frameborder="0"></iframe>
        </div>
      </div>
    </DPageContent>
  </DPage>
</template>
