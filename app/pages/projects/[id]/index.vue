<script setup lang="ts">
import { PlusIcon, Trash2Icon, XIcon } from "lucide-vue-next"

const id = useRouteParams<string>("id")

const { data: event } = await useFetch(`/api/events/${id.value}`)
const { data: eventCompetences, refresh: refreshEventCompetences } = await useFetch(`/api/events/${id.value}/competences`)
const { data: students } = await useFetch("/api/users", { params: { role: "student" } })
const studentLevels = ref<Record<string, Record<string, number | null>>>({})
const competenceFilter = ref("")
const studentFilter = ref("")
const showCompetenceModal = ref(false)
const selectedCompetences = computed(() => (eventCompetences.value ?? []).map((competence) => competence.competenceId))

const filteredCompetences = computed(() => {
  const query = competenceFilter.value.trim().toLowerCase()
  if (!query) return eventCompetences.value ?? []

  return (eventCompetences.value ?? []).filter((competence) => competence.name.toLowerCase().includes(query))
})

const filteredStudents = computed(() => {
  const query = studentFilter.value.trim().toLowerCase()
  if (!query) return students.value ?? []

  return (students.value ?? []).filter((student) => `${student.firstName} ${student.lastName}`.toLowerCase().includes(query))
})

async function loadStudentLevels() {
  if (!students.value?.length) {
    studentLevels.value = {}
    return
  }

  const levels = await Promise.all(
    students.value.map(async (student) => {
      const competences = await $fetch<any[]>(`/api/users/${student.id}/competences`, { params: { all: true } })
      return [student.id, Object.fromEntries(competences.map((competence) => [competence.id, competence.userLevel]))] as const
    })
  )

  studentLevels.value = Object.fromEntries(levels)
}

watch(
  () => students.value,
  () => {
    loadStudentLevels()
  },
  { immediate: true }
)

async function toggleCompetence(competence: any) {
  const isSelected = selectedCompetences.value.includes(competence.id)
  if (isSelected) {
    await $fetch(`/api/events/${id.value}/competences/${competence.id}`, { method: "DELETE" })
  } else {
    await $fetch(`/api/events/${id.value}/competences`, { method: "POST", body: { competenceId: competence.id } })
  }
  await refreshEventCompetences()
  await loadStudentLevels()
}

function competenceRange(competence: any) {
  const grades = competence?.grades ?? []
  if (!grades.length) return "-"
  const first = grades[0]
  const last = grades[grades.length - 1]
  return first === last ? `${first}` : `${first} - ${last}`
}

function userLevel(studentId: string, competenceId: string) {
  const level = studentLevels.value[studentId]?.[competenceId]
  return level === null || level === undefined ? null : level
}

async function updateStudentLevel(competenceId: string, studentId: string, level: number) {
  await $fetch(`/api/users/${studentId}/competences/${competenceId}/level`, {
    method: "POST",
    body: { level }
  })

  await loadStudentLevels()
}

const name = computed({
  get: () => event.value?.title,
  set: async (value) => {
    event.value!.title = value
    await $fetch(`/api/events/${id.value}`, {
      method: "PATCH",
      body: {
        id: id.value,
        title: value
      }
    })
  }
})

const description = computed({
  get: () => event.value?.body,
  set: async (value) => {
    event.value!.body = value
    await $fetch(`/api/events/${id.value}`, {
      method: "PATCH",
      body: {
        id: id.value,
        body: value
      }
    })
  }
})

async function deleteEvent() {
  let confirmed = confirm("Möchtest du diesen Eintrag wirklich archivieren?")
  if (!confirmed) return

  await $fetch(`/api/events/${id.value}`, {
    method: "DELETE"
  })
  await navigateTo("/projects")
}
</script>

<template>
  <DPage v-if="event">
    <DHeader>
      <DButton :icon-left="XIcon" variant="secondary" to="/projects"></DButton>

      <template #right>
        <div class="flex items-center gap-2">
          <DButton :icon-left="Trash2Icon" variant="danger-light" @click="deleteEvent">Archivieren</DButton>
        </div>
      </template>
    </DHeader>

    <DPageContent>
      <div class="mx-auto w-full max-w-3xl p-4">
        <textarea
          type="text"
          v-model="name"
          class="mb-2.5 field-sizing-content w-full resize-none text-2xl font-medium outline-0"
          placeholder="Veranstaltungsname"
        />

        <textarea
          type="text"
          v-model="description"
          class="mb-2.5 field-sizing-content w-full resize-none text-gray-800 outline-0"
          placeholder="Füge eine Beschreibung hinzu"
        />

        <div class="mt-8 rounded-md border border-neutral-200 p-4 text-sm text-neutral-700">
          <div class="mb-3 flex items-center justify-between">
            <div class="font-bold text-neutral-900">Kompetenzen</div>
            <DButton :icon-left="PlusIcon" variant="secondary" @click="showCompetenceModal = true">Hinzufügen</DButton>
          </div>

          <div class="mb-3 grid gap-2 md:grid-cols-2">
            <div class="rounded-md border border-neutral-200 bg-white px-2 py-1.5">
              <div class="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Kompetenz-Filter</div>
              <input v-model="competenceFilter" type="text" class="w-full border-0 bg-transparent p-0 text-sm text-neutral-700 outline-none placeholder:text-neutral-400" />
            </div>
            <div class="rounded-md border border-neutral-200 bg-white px-2 py-1.5">
              <div class="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Schüler-Filter</div>
              <input v-model="studentFilter" type="text" class="w-full border-0 bg-transparent p-0 text-sm text-neutral-700 outline-none placeholder:text-neutral-400" />
            </div>
          </div>

          <div v-if="filteredCompetences.length" class="space-y-3">
            <div v-for="competence in filteredCompetences" :key="competence.competenceId" class="rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <div class="mb-2 flex items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-2">
                  <DTag :color="competence.color ?? 'gray'">{{ competence.name }}</DTag>
                  <span class="text-xs text-neutral-500">Kl. {{ competenceRange(competence) }}</span>
                </div>
              </div>

              <div v-if="filteredStudents.length" class="flex flex-wrap gap-2">
                <div v-for="student in filteredStudents" :key="student.id" class="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5">
                  <span class="min-w-0 text-xs text-neutral-700">{{ student.firstName }} {{ student.lastName }}</span>
                  <div class="flex items-center gap-1">
                    <button
                      v-for="level in [0, 1, 2, 3]"
                      :key="`${competence.competenceId}-${student.id}-${level}`"
                      type="button"
                      class="h-6 min-w-6 rounded border px-1 text-[10px] font-medium transition-colors"
                      :class="userLevel(student.id, competence.competenceId) === level ? 'border-blue-600 bg-blue-600 text-white' : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100'"
                      @click="updateStudentLevel(competence.competenceId, student.id, level)"
                    >
                      {{ level }}
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="text-xs text-neutral-500">Keine passenden Schüler gefunden.</div>
            </div>
          </div>
          <div v-else class="text-neutral-500">Keine passenden Kompetenzen gefunden.</div>
        </div>
      </div>
    </DPageContent>

    <DModal v-if="showCompetenceModal" titel="Kompetenzen" @close="showCompetenceModal = false" @confirm="showCompetenceModal = false">
      <DCompetenceSearch :selected="selectedCompetences" @toggle="toggleCompetence" />
    </DModal>
  </DPage>
</template>
