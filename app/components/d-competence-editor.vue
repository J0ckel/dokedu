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
const grades = ref("1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13")
const error = ref("")

const isEditing = computed(() => Boolean(props.competence))
const typeOptions = [
  { value: "subject", label: "Fachbereich" },
  { value: "group", label: "Gruppe" },
  { value: "competence", label: "Kompetenz" }
]

function open() {
  name.value = props.competence?.name ?? ""
  competenceType.value = props.competence?.competenceType ?? "competence"
  grades.value = props.competence?.grades?.join(", ") ?? "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13"
  error.value = ""
  modal.value = true
}

function close() {
  modal.value = false
}

async function save() {
  const parsedGrades = grades.value.split(",").map((grade) => Number(grade.trim())).filter((grade) => Number.isInteger(grade) && grade >= 1 && grade <= 13)
  if (!name.value.trim() || parsedGrades.length === 0) {
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
        grades: parsedGrades
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
        <DInput v-model="grades" placeholder="Klassenstufen, z. B. 1, 2, 3" />
        <p v-if="error" class="text-sm text-red-700">{{ error }}</p>
      </div>
    </DModal>
  </div>
</template>