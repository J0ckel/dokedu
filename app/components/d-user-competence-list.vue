<script setup lang="ts">
import type { DCompetence } from "~/types/models"

interface Props {
  entryId?: string
  userCompetences?: any[]
  students?: { id: string; name: string }[]
}

const props = defineProps<Props>()
const emit = defineEmits(["remove", "updateLevel"])

async function remove(competence: DCompetence, userId?: string) {
  emit("remove", competence, userId)
}

const reduced = computed(() => {
  const items = props.userCompetences ?? []
  const seen = new Set<string>()

  return items.filter((uc) => {
    const key = `${uc.userId ?? "unknown"}-${uc.competenceId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

function studentName(userCompetence: any) {
  const user = userCompetence.user ?? props.students?.find((student) => student.id === userCompetence.userId)
  return user ? ("name" in user ? user.name : `${user.firstName} ${user.lastName}`) : "Unbekannter Schüler"
}

async function levelChange(competenceId: string, level: number, userId?: string) {
  emit("updateLevel", competenceId, level, userId)
}
</script>

<template>
  <div v-show="reduced.length > 0">
    <DLabel>Kompetenzen</DLabel>
    <div class="divide-y divide-neutral-200">
      <div v-for="userCompetence in reduced" :key="userCompetence.id">
        <DUserCompetence
          :userCompetence="userCompetence"
          :student-name="studentName(userCompetence)"
          @remove="remove(userCompetence.competence, userCompetence.userId)"
          @levelChange="(level, userId) => levelChange(userCompetence.competenceId, level, userId ?? userCompetence.userId)"
        />
      </div>
    </div>
  </div>
</template>
