<script setup lang="ts">
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-vue-next"

const props = defineProps<{
  competence?: any
  parentId?: string | null
}>()
const emit = defineEmits<{ saved: []; deleted: [] }>()

const modal = ref(false)
const name = ref("")
const competenceType = ref<"subject" | "group" | "competence">("competence")
const gradeOptions = Array.from({ length: 10 }, (_, index) => index + 1)
const grades = ref<number[]>([...gradeOptions])
const error = ref("")

const isEditing = computed(() => Boolean(props.competence))
const typeOptions = [
  { value: "subject", label: "Fachbereich" },
  { value: "group", label: "Gruppe" },
  { value: "competence", label: "Kompetenz" }
]

function isGradeChecked(grade: number) {
  return grades.value.includes(grade)
}

function toggleGrade(grade: number, checked: boolean) {
  if (checked) {
    if (!grades.value.includes(grade)) grades.value = [...grades.value, grade].sort((a, b) => a - b)
  } else {
    grades.value = grades.value.filter((value) => value !== grade)
  }
}

function open() {
  name.value = props.competence?.name ?? ""
  competenceType.value = props.competence?.competenceType ?? "competence"
  grades.value = props.competence?.grades?.length ? [...props.competence.grades] : [...gradeOptions]
  error.value = ""
  modal.value = true
}

function close() {
  modal.value = false
}

async function save() {
  if (!name.value.trim() || grades.value.length === 0) {
    error.value = "Bitte Name und mindestens eine Klassenstufe angeben."
    return
  }

  try {
    await $fetch(props.competence ? `/api/competences/${props.competence.id}` : "/api/competences", {
      method: props.competence ? "PUT" : "POST",
      body: {
        name: name.value,
        competenceType: competenceType.value,
        competenceId: props.competence?.competenceId ?? props.parentId ?? null,
        grades: grades.value
      }
    })
    close()
    emit("saved")
  } catch (cause: any) {
    error.value = cause?.data?.message ?? "Die Kompetenz konnte nicht gespeichert werden."
  }
}

async function remove() {
  if (!props.competence || !window.confirm(`Kompetenz „${props.competence.name}“ wirklich löschen?`)) return
  try {
    await $fetch(`/api/competences/${props.competence.id}`, { method: "DELETE" })
    emit("deleted")
  } catch (cause: any) {
    error.value = cause?.data?.message ?? "Die Kompetenz konnte nicht gelöscht werden."
  }
}
</script>

<template>
  <div class="flex items-center gap-1">
    <DButton v-if="competence" variant="secondary" :icon-left="PencilIcon" class="!p-1.5" title="Kompetenz bearbeiten" @click.prevent.stop="open" />
    <DButton v-if="competence" variant="secondary" :icon-left="Trash2Icon" class="!p-1.5 text-red-700" title="Kompetenz löschen" @click.prevent.stop="remove" />
    <DButton v-else :icon-left="PlusIcon" @click="open">Kompetenz erstellen</DButton>

    <DModal v-if="modal" :titel="isEditing ? 'Kompetenz bearbeiten' : 'Kompetenz erstellen'" :confirm-text="isEditing ? 'Aktualisieren' : 'Erstellen'" @close="close" @confirm="save">
      <div class="flex flex-col gap-4 p-4">
        <DInput v-model="name" placeholder="Name" />
        <label class="flex flex-col gap-1 text-sm text-neutral-700">
          Typ
          <select v-model="competenceType" class="rounded-md border border-neutral-200 px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-600">
            <option v-for="option in typeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5 text-sm text-neutral-700">
          Klassenstufen
          <div class="flex flex-wrap gap-3">
            <label v-for="grade in gradeOptions" :key="grade" class="flex items-center gap-1">
              <input
                type="checkbox"
                :checked="isGradeChecked(grade)"
                @change="toggleGrade(grade, ($event.target as HTMLInputElement).checked)"
              />
              {{ grade }}
            </label>
          </div>
        </label>
        <p v-if="error" class="text-sm text-red-700">{{ error }}</p>
      </div>
    </DModal>
  </div>
</template>