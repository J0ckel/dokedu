<script setup lang="ts">
const { user } = useUserSession()
const canManage = computed(() => user.value?.role === "admin" || user.value?.role === "owner" || user.value?.role === "competence_admin")
const search = ref("")
const grade = ref<number | null>(null)
const queryParams = computed(() => ({
  search: search.value,
  ...(grade.value === null ? {} : { grade: grade.value })
}))

const { data: competences, refresh } = await useFetch("/api/competences", {
  params: queryParams
})

// Filter modal
const showFilterModal = ref(false)

const syncingGrades = ref(false)
async function syncGrades() {
  if (syncingGrades.value) return
  syncingGrades.value = true
  try {
    const result = await $fetch("/api/competences/sync-grades", { method: "POST" })
    alert(`${result.updatedCount} Gruppe(n)/Fachbereich(e) wurden aktualisiert.`)
    await refresh()
  } catch (cause: any) {
    alert(cause?.data?.message ?? "Synchronisierung fehlgeschlagen.")
  } finally {
    syncingGrades.value = false
  }
}

// Gelöschte Kompetenzen (Papierkorb)
const showDeletedModal = ref(false)
const deletedCompetences = ref<any[]>([])
const restoringId = ref<string | null>(null)

async function openDeletedModal() {
  showDeletedModal.value = true
  deletedCompetences.value = await $fetch("/api/competences/deleted")
}

async function restoreCompetence(id: string) {
  restoringId.value = id
  try {
    await $fetch(`/api/competences/${id}/restore`, { method: "POST" })
    deletedCompetences.value = deletedCompetences.value.filter((competence) => competence.id !== id)
    await refresh()
  } catch (cause: any) {
    alert(cause?.data?.message ?? "Wiederherstellen fehlgeschlagen.")
  } finally {
    restoringId.value = null
  }
}
</script>

<template>
  <DPage>
    <DHeader>
      <DHeaderTitle>Kompetenzen</DHeaderTitle>
      <DInputSearch v-model="search" />
      <input v-model.number="grade" type="number" min="1" max="13" placeholder="Klassenstufe" class="w-32 rounded-md border-none bg-neutral-100 px-2 py-1.5 text-sm ring-blue-600 ring-offset-2 outline-none focus:ring-2" />
      <template #right>
        <DButton v-if="canManage" variant="secondary" @click="openDeletedModal">Gelöschte Kompetenzen</DButton>
        <DButton v-if="canManage" variant="secondary" :disabled="syncingGrades" @click="syncGrades">Klassenstufen synchronisieren</DButton>
        <DCompetenceEditor v-if="canManage" @saved="refresh" />
      </template>
    </DHeader>

    <!-- <DModal titel="Filter" v-if="showFilterModal" @close="showFilterModal = false" confirm-text="Schließen" @confirm="showFilterModal = false">
      <div class="p-4 text-sm text-neutral-500">
        Diese Version von Dokedu unterstützt aktuell das Filtern von Schülern nicht. Wir arbeiten daran, dass diese Funktion bald verfügbar ist.
      </div>
    </DModal> -->

    <div class="block min-h-0 px-4 pt-2.5">
      <div class="grid items-center justify-between gap-4 border-b border-neutral-200 px-2 pb-2" :class="search ? 'grid-cols-4' : 'grid-cols-2'" :style="{ gridTemplateColumns: search ? '1fr 110px 120px 110px' : '1fr 110px' }">
        <div class="border-r border-neutral-200 text-sm font-medium text-neutral-900">Name</div>
        <div v-if="search" class="border-r border-neutral-200 text-sm font-medium text-neutral-900">Fach</div>
        <div v-if="search" class="border-r border-neutral-200 text-sm font-medium text-neutral-900">Gruppe</div>
        <div class="border-r border-neutral-200 text-sm font-medium text-neutral-900">Klassenstufen</div>
      </div>
    </div>

    <DPageContent>
      
      <div
        v-for="competence in competences"
        class="grid items-center justify-between gap-4 rounded px-2 py-2 hover:bg-neutral-100"
        :class="search ? 'grid-cols-4' : 'grid-cols-2'"
        :style="{ gridTemplateColumns: search ? '1fr 110px 120px 110px' : '1fr 110px' }"
      >
        <RouterLink :to="`/competences/${competence.id}`" class="line-clamp-1 text-sm text-neutral-700">
          <span v-if="competence.competenceType === 'competence'">{{ competence.name }}</span>
          <DTag v-else class="w-fit border border-neutral-200 shadow-sm" :color="competence.color ? competence.color : 'gray'">{{ competence.name }}</DTag>
        </RouterLink>
        <RouterLink v-if="search && competence.subjectId" :to="`/competences/${competence.subjectId}`" class="inline-flex max-w-full items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900">{{ competence.subjectName }}</RouterLink>
        <RouterLink v-if="search && competence.groupId" :to="`/competences/${competence.groupId}`" class="inline-flex max-w-full items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900">{{ competence.groupName }}</RouterLink>
        <div class="line-clamp-1 text-right text-sm text-neutral-700">
          <template v-if="competence.grades"> {{ competence.grades[0] }} - {{ competence.grades[competence.grades.length - 1] }} </template>
        </div>
        <DCompetenceEditor v-if="canManage" class="justify-end" :class="search ? 'col-span-4' : 'col-span-2'" :competence="competence" @saved="refresh" @deleted="refresh" />
      </div>
    </DPageContent>

    <DModal titel="Gelöschte Kompetenzen" v-if="showDeletedModal" @close="showDeletedModal = false" confirm-text="Schließen" @confirm="showDeletedModal = false">
      <div v-if="deletedCompetences.length === 0" class="p-4 text-sm text-neutral-500">Keine gelöschten Kompetenzen vorhanden.</div>
      <div v-else class="divide-y divide-neutral-200">
        <div v-for="competence in deletedCompetences" :key="competence.id" class="flex items-center justify-between gap-2 px-4 py-2">
          <div class="min-w-0">
            <div class="line-clamp-1 text-sm text-neutral-700">{{ competence.name }}</div>
            <div class="text-xs text-neutral-400">Gelöscht am {{ new Date(competence.deletedAt).toLocaleDateString("de-DE") }}</div>
          </div>
          <DButton variant="secondary" :disabled="restoringId === competence.id" @click="restoreCompetence(competence.id)">Wiederherstellen</DButton>
        </div>
      </div>
    </DModal>
  </DPage>
</template>
