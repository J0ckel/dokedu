<script setup lang="ts">
import { FilterIcon, PlusIcon, SquareChartGanttIcon, XIcon } from "lucide-vue-next"

const search = ref("")
const selectedSubjects = ref<string[]>([])

const { data: events } = await useFetch("/api/events")

const subjects = computed(() => Array.from(new Set((events.value ?? []).flatMap((event) => event.subjects))).sort((first, second) => first.localeCompare(second, "de")))

const filteredEvents = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("de")

  return (events.value ?? []).filter((event) => {
    const matchesSearch = !query || event.title.toLocaleLowerCase("de").includes(query) || event.subjects.some((subject) => subject.toLocaleLowerCase("de").includes(query))
    const matchesSubjects = !selectedSubjects.value.length || selectedSubjects.value.some((subject) => event.subjects.includes(subject))
    return matchesSearch && matchesSubjects
  })
})

// Filter modal
const showFilterModal = ref(false)

function toggleFilterModal() {
  showFilterModal.value = !showFilterModal.value
}

function toggleSubject(subject: string, checked: boolean) {
  if (checked) {
    selectedSubjects.value = [...selectedSubjects.value, subject]
  } else {
    selectedSubjects.value = selectedSubjects.value.filter((selectedSubject) => selectedSubject !== subject)
  }
}

function clearSubjectFilters() {
  selectedSubjects.value = []
}
</script>

<template>
  <DPage>
    <DHeader>
      <DHeaderTitle>Veranstaltungen</DHeaderTitle>
      <DInputSearch v-model="search" />
      <DButton :icon-left="FilterIcon" :variant="selectedSubjects.length ? 'tertiary' : 'secondary'" @click="toggleFilterModal">
        {{ selectedSubjects.length ? `Filter (${selectedSubjects.length})` : "Filter" }}
      </DButton>

      <template #right>
        <DButton :icon-left="SquareChartGanttIcon" to="/projects/export" variant="secondary">Export</DButton>
        <DButton :icon-left="PlusIcon" to="/projects/new">Veranstaltung erstellen</DButton>
      </template>
    </DHeader>

    <DModal titel="Fach filtern" v-if="showFilterModal" @close="showFilterModal = false" confirm-text="Anwenden" @confirm="showFilterModal = false">
      <div class="flex flex-col gap-2 p-4 text-sm text-neutral-700">
        <label v-for="subject in subjects" :key="subject" class="flex items-center gap-2">
          <input type="checkbox" :checked="selectedSubjects.includes(subject)" @change="toggleSubject(subject, ($event.target as HTMLInputElement).checked)" />
          {{ subject }}
        </label>
        <p v-if="!subjects.length" class="text-neutral-500">Es sind noch keine Kompetenzen Veranstaltungen zugeordnet.</p>
      </div>
    </DModal>

    <div class="block min-h-0 px-4 pt-2.5">
      <div v-if="selectedSubjects.length" class="mb-2 flex items-center gap-2 px-2 text-sm text-neutral-700">
        <span class="font-medium">Gefiltert nach:</span>
        <DTag v-for="subject in selectedSubjects" :key="subject" color="blue">{{ subject }}</DTag>
        <DButton :icon-left="XIcon" size="sm" variant="transparent" title="Filter zurücksetzen" @click="clearSubjectFilters" />
      </div>
      <div class="grid items-center gap-4 border-b border-neutral-200 px-2 pb-2" :style="{ gridTemplateColumns: 'minmax(12rem, 1fr) 2fr' }">
        <div class="border-r border-neutral-200 text-sm font-medium text-neutral-900">Titel</div>
        <div class="text-sm font-medium text-neutral-900">Erworbene Kompetenzen</div>
      </div>
    </div>

    <DPageContent>
      <RouterLink
        :to="`/projects/${project.id}`"
        v-for="project in filteredEvents"
        :key="project.id"
        class="grid items-center gap-4 rounded px-2 py-2 hover:bg-neutral-100"
        :style="{ gridTemplateColumns: 'minmax(12rem, 1fr) 2fr' }"
      >
        <div class="line-clamp-1 text-sm text-ellipsis text-neutral-700">{{ project.title }}</div>
        <div class="flex flex-wrap gap-1.5">
          <DTag v-for="competence in project.competences" :key="competence.id" color="gray">
            {{ competence.name }}
          </DTag>
          <span v-if="!project.competences.length" class="text-sm text-neutral-500">Keine Kompetenzen zugeordnet</span>
        </div>
      </RouterLink>
    </DPageContent>
  </DPage>
</template>
