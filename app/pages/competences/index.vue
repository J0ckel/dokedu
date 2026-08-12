<script setup lang="ts">
const { user } = useUserSession()
const canManage = computed(() => user.value?.role === "admin" || user.value?.role === "owner")
const search = ref("")

const { data: competences, refresh } = await useFetch("/api/competences", {
  params: {
    search: search
  }
})

// Filter modal
const showFilterModal = ref(false)
</script>

<template>
  <DPage>
    <DHeader>
      <DHeaderTitle>Kompetenzen</DHeaderTitle>
      <DInputSearch v-model="search" />
      <template #right>
        <DCompetenceEditor v-if="canManage" @saved="refresh" />
      </template>
    </DHeader>

    <!-- <DModal titel="Filter" v-if="showFilterModal" @close="showFilterModal = false" confirm-text="Schließen" @confirm="showFilterModal = false">
      <div class="p-4 text-sm text-neutral-500">
        Diese Version von Dokedu unterstützt aktuell das Filtern von Schülern nicht. Wir arbeiten daran, dass diese Funktion bald verfügbar ist.
      </div>
    </DModal> -->

    <div class="block min-h-0 px-4 pt-2.5">
      <div class="grid grid-cols-2 items-center justify-between gap-4 border-b border-neutral-200 px-2 pb-2" :style="{ gridTemplateColumns: '1fr 110px' }">
        <div class="border-r border-neutral-200 text-sm font-medium text-neutral-900">Name</div>
        <div class="border-r border-neutral-200 text-sm font-medium text-neutral-900">Klassenstufen</div>
      </div>
    </div>

    <DPageContent>
      
      <div
        v-for="competence in competences"
        class="grid grid-cols-2 items-center justify-between gap-4 rounded px-2 py-2 hover:bg-neutral-100"
        :style="{ gridTemplateColumns: '1fr 110px' }"
      >
        <RouterLink :to="`/competences/${competence.id}`" class="line-clamp-1 text-sm text-neutral-700">
          <span v-if="competence.competenceType === 'competence'">{{ competence.name }}</span>
          <DTag v-else class="w-fit" :color="competence.color ? competence.color : 'gray'">{{ competence.name }}</DTag>
        </RouterLink>
        <div class="line-clamp-1 text-right text-sm text-neutral-700">
          <template v-if="competence.grades"> {{ competence.grades[0] }} - {{ competence.grades[competence.grades.length - 1] }} </template>
        </div>
        <DCompetenceEditor v-if="canManage" class="col-span-2 justify-end" :competence="competence" @saved="refresh" @deleted="refresh" />
      </div>
    </DPageContent>
  </DPage>
</template>
