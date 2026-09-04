<script setup lang="ts">
import { ChevronRight, CircleCheckIcon, CircleIcon, FolderIcon } from "lucide-vue-next"
import type { DCompetence } from "~/types/models"

const emit = defineEmits(["toggle"])

interface Props {
  selected: string[]
  students: { id: string; name: string }[]
  studentCompetenceSelections?: Record<string, string[]>
  suggested?: DCompetence[]
}

const props = defineProps<Props>()
const pendingSelection = ref<Record<string, boolean>>({})
const studentLevels = ref<Record<string, Record<string, number | null>>>({})
const competenceHistories = ref<Record<string, Record<string, any[]>>>({})
const expandedHistoryId = ref<string | null>(null)

watch(
  () => props.selected,
  (selected) => {
    for (const [competenceId, pendingValue] of Object.entries(pendingSelection.value)) {
      if (selected.includes(competenceId) === pendingValue) {
        Reflect.deleteProperty(pendingSelection.value, competenceId)
      }
    }
  }
)

function isSelected(competenceId: string) {
  return pendingSelection.value[competenceId] ?? props.selected.includes(competenceId)
}

async function loadStudentLevels() {
  const levels = await Promise.all(props.students.map(async (student) => {
    const competences = await $fetch<any[]>(`/api/users/${student.id}/competences`, { params: { all: true } })
    return [student.id, Object.fromEntries(competences.map((competence) => [competence.id, competence.userLevel]))] as const
  }))
  studentLevels.value = Object.fromEntries(levels)
}

onMounted(loadStudentLevels)
watch(() => props.students, loadStudentLevels, { deep: true })

const navigationItems = ref<DCompetence[]>([])

const competenceId = computed(() => {
  if (navigationItems.value.length > 0) {
    return navigationItems.value[navigationItems.value.length - 1]?.id
  }
})

const search = ref("")
const debouncedSearch = useDebounce(search, 100)
const grade = ref<number | null>(null)
const queryParams = computed(() => ({
  competenceId: competenceId.value,
  search: debouncedSearch.value,
  ...(grade.value === null ? {} : { grade: grade.value })
}))

const { data: competences } = useFetch("/api/competences", {
  params: queryParams
})

const filtered = computed(() => {
  const items = competences.value ?? []
  const hasSearchFilter = debouncedSearch.value.trim().length > 0 || grade.value !== null
  if (!hasSearchFilter) return items

  return items.filter((competence) => competence.competenceType === "competence")
})

async function onClick(competence: DCompetence) {
  if (competence.competenceType == "competence") {
    pendingSelection.value[competence.id] = !isSelected(competence.id)

    if (expandedHistoryId.value === competence.id) {
      expandedHistoryId.value = null
    } else {
      expandedHistoryId.value = competence.id
    }
    emit("toggle", competence)

    if (expandedHistoryId.value === competence.id) {
      try {
        const histories = await Promise.all(props.students.map(async (student) => {
          const history = await $fetch<any[]>(`/api/users/${student.id}/competences/${competence.id}/history`)
          return [student.id, history] as const
        }))
        competenceHistories.value[competence.id] = Object.fromEntries(histories)
      } catch {
        competenceHistories.value[competence.id] = {}
      }
    }
    return
  }
  search.value = ""
  navigationItems.value.push(competence)
}

function isStudentSelected(competenceId: string, studentId: string) {
  return !!props.studentCompetenceSelections?.[competenceId]?.includes(studentId)
}

function onStudentToggle(competence: DCompetence, studentId: string) {
  emit("toggle", competence, studentId)
}

async function navigateTo(competenceId: string | null) {
  if (competenceId === null) {
    navigationItems.value = []
  }

  // find index of the competence in the navigation items
  const index = navigationItems.value.findIndex((c) => c.id === competenceId)

  // remove all the items after the index
  navigationItems.value = navigationItems.value.slice(0, index + 1)
}

function levels(competence: DCompetence) {
  // find first and last level
  const first = competence.grades[0]
  const last = competence.grades[competence.grades.length - 1]

  // if first and last are the same level, return just the level
  if (first === last) return `${first}`

  return `${first} - ${last}`
}

function userLevel(studentId: string, competenceId: string) {
  const level = studentLevels.value[studentId]?.[competenceId]
  return level === null || level === undefined ? "-" : `${level}`
}

function historyDate(value: string) {
  return new Date(value).toLocaleDateString("de-DE")
}

// fill-red-600 fill-orange-600 fill-amber-600 fill-yellow-600 fill-lime-600 fill-green-600 fill-emerald-600 fill-teal-600 fill-cyan-600 fill-sky-600 fill-blue-600 fill-indigo-600 fill-violet-600 fill-purple-600 fill-fuchsia-600 fill-pink-600 fill-rose-600
// stroke-gray-600 stroke-red-600 stroke-orange-600 stroke-amber-600 stroke-yellow-600 stroke-lime-600 stroke-green-600 stroke-emerald-600 stroke-teal-600 stroke-cyan-600 stroke-sky-600 stroke-blue-600 stroke-indigo-600 stroke-violet-600 stroke-purple-600 stroke-fuchsia-600 stroke-pink-600 stroke-rose-600
</script>

<template>
  <div class="flex h-[500px] w-full flex-col">
    <div class="flex w-full border-b border-neutral-200">
      <input
        type="text"
        name="search"
        id="search"
        class="min-w-0 flex-1 border-none px-4 py-2 pb-1.5 text-sm outline-none focus:border-neutral-300 focus:ring-0 focus:outline-0"
        placeholder="Suche..."
        v-model="search"
      />
      <input v-model.number="grade" type="number" min="1" max="13" placeholder="Klassenstufe" class="w-36 border-0 border-l border-neutral-200 px-3 py-2 pb-1.5 text-sm outline-none focus:border-neutral-300 focus:ring-0 focus:outline-0" />
    </div>
    <div v-if="suggested && suggested.length > 0 && !search" class="border-b border-neutral-200">
      <div class="px-4 pt-2 pb-1 text-xs font-medium text-neutral-500">Kompetenzen aus der Veranstaltung</div>
      <div
        v-for="competence in suggested"
        :key="'suggested-' + competence.id"
        class="flex cursor-default items-center gap-1.5 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
        :class="isSelected(competence.id) ? 'bg-blue-50 text-blue-900 hover:bg-blue-100' : ''"
        @click="onClick(competence)"
      >
        <CircleCheckIcon v-if="isSelected(competence.id)" class="size-4 text-blue-600" />
        <CircleIcon v-else class="size-4 text-neutral-400" />
        <div class="flex-1">{{ competence.name }}</div>
      </div>
    </div>
    <div v-if="competences" class="flex cursor-default flex-wrap items-center gap-0.5 border-b border-neutral-200 px-3 py-2 text-sm text-neutral-500">
      <div class="rounded-md p-0.5 leading-none hover:bg-neutral-100" @click="navigateTo(null)">Fächer</div>
      <template v-for="item in navigationItems">
        <ChevronRight class="size-4" />
        <div class="rounded-md p-0.5 leading-none hover:bg-neutral-100" @click="navigateTo(item.id)">
          {{ item.name }}
        </div>
      </template>
    </div>
    <div class="flex-1 divide-y divide-neutral-200 overflow-auto">
      <template v-for="competence in filtered" :key="competence.id">
        <div
          class="flex cursor-default items-start justify-between gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
          :class="isSelected(competence.id) ? 'bg-blue-50 text-blue-900 hover:bg-blue-100' : ''"
          @click="onClick(competence)"
        >
          <div class="flex items-start gap-1.5">
          <FolderIcon
            v-if="competence.competenceType !== 'competence'"
            class="mt-0.5 size-4"
            :class="
              competence.competenceType === 'subject'
                ? `fill-${competence.color ? competence.color : 'neutral'}-600 stroke-${competence.color ? competence.color : 'gray'}-600`
                : `fill-neutral-600`
            "
          />
          <template v-else>
            <CircleCheckIcon v-if="isSelected(competence.id)" class="mt-0.5 size-4 text-blue-600" />
            <CircleIcon v-else class="mt-0.5 size-4 text-neutral-400" />
          </template>
            <div class="flex-1">{{ competence.name }}</div>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-0.5 text-xs text-neutral-500">
            <span class="whitespace-nowrap">Kl. {{ levels(competence) }}</span>
            <div class="flex flex-wrap justify-end gap-1">
              <button
                v-for="student in props.students"
                :key="student.id"
                type="button"
                class="rounded-full border px-1.5 py-0.5 transition-colors"
                :class="isStudentSelected(competence.id, student.id) ? 'border-blue-300 bg-blue-100 text-blue-800' : 'border-neutral-300 bg-white text-neutral-600'"
                @click.stop="onStudentToggle(competence, student.id)"
                :title="`${student.name}: ${userLevel(student.id, competence.id)}`"
              >
                {{ student.name }}
              </button>
            </div>
          </div>
        </div>
        <div v-if="expandedHistoryId === competence.id" class="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-600">
          <div v-for="student in props.students" :key="student.id" class="py-1">
            <span class="font-medium">{{ student.name }}:</span>
            <span v-if="competenceHistories[competence.id]?.[student.id]?.length">
              <span v-for="(item, index) in competenceHistories[competence.id][student.id]" :key="item.id">
                <span v-if="index > 0"> · </span>Niveau {{ item.level }} ({{ historyDate(item.createdAt) }})
              </span>
            </span>
            <span v-else> noch kein Verlauf</span>
          </div>
        </div>
      </template>
      <div v-show="filtered?.length === 0" class="px-4 py-2">
        <div class="text-sm text-neutral-500">Keine Ergebnisse...</div>
      </div>
    </div>
  </div>
</template>
