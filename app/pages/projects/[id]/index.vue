<script setup lang="ts">
import { formatDate } from "@vueuse/core"
import { ArrowRightIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-vue-next"

const id = useRouteParams<string>("id")

const { data: event } = await useFetch(`/api/events/${id.value}`)
const { data: eventCompetences, refresh: refreshEventCompetences } = await useFetch(`/api/events/${id.value}/competences`)
const { data: students } = await useFetch("/api/users", { params: { role: "student" } })
const studentLevels = ref<Record<string, Record<string, number | null>>>({})
const showCompetenceModal = ref(false)
const selectedCompetences = computed(() => (eventCompetences.value ?? []).map((competence) => competence.competenceId))

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

const startsAt = computed({
  get: () => (event.value?.startsAt ? formatDate(new Date(Date.parse(event.value?.startsAt)), "YYYY-MM-DD") : ""),
  set: async (value) => {
    event.value!.startsAt = value
    await $fetch(`/api/events/${id.value}`, {
      method: "PATCH",
      body: {
        id: id.value,
        startsAt: value
      }
    })
  }
})

const endsAt = computed({
  get: () => (event.value?.endsAt ? formatDate(new Date(Date.parse(event.value?.endsAt)), "YYYY-MM-DD") : ""),
  set: async (value) => {
    event.value!.endsAt = value
    await $fetch(`/api/events/${id.value}`, {
      method: "PATCH",
      body: {
        id: id.value,
        endsAt: value
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

        <div class="mb-2 flex items-center gap-2">
          <d-input v-model="startsAt" type="date" placeholder="Startdatum" />
          <ArrowRightIcon class="h-5 w-5 text-gray-500" />
          <d-input v-model="endsAt" type="date" placeholder="Enddatum" />
        </div>

        <div class="mt-8 rounded-md border border-neutral-200 p-4 text-sm text-neutral-700">
          <div class="mb-3 flex items-center justify-between">
            <div class="font-bold text-neutral-900">Kompetenzen</div>
            <DButton :icon-left="PlusIcon" variant="secondary" @click="showCompetenceModal = true">Hinzufügen</DButton>
          </div>
          <div v-if="eventCompetences?.length" class="space-y-3">
            <div v-for="competence in eventCompetences" :key="competence.competenceId" class="rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <div class="mb-2 flex items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-2">
                  <DTag :color="competence.color ?? 'gray'">{{ competence.name }}</DTag>
                  <span class="text-xs text-neutral-500">Kl. {{ competenceRange(competence) }}</span>
                </div>
              </div>

              <div v-if="students?.length" class="flex flex-wrap gap-2">
                <div v-for="student in students" :key="student.id" class="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5">
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
              <div v-else class="text-xs text-neutral-500">Noch keine Schüler verfügbar.</div>
            </div>
          </div>
          <div v-else class="text-neutral-500">Noch keine Kompetenzen zugeordnet.</div>
        </div>
      </div>
    </DPageContent>

    <DModal v-if="showCompetenceModal" titel="Kompetenzen" @close="showCompetenceModal = false" @confirm="showCompetenceModal = false">
      <DCompetenceSearch :selected="selectedCompetences" @toggle="toggleCompetence" />
    </DModal>
  </DPage>
</template>
