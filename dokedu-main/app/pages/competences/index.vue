<script setup lang="ts">
const search = ref("")

const { data: competences } = await useFetch("/api/competences", {
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
      <!-- <DButton :icon-left="FilterIcon" variant="secondary" @click="toggleFilterModal">Filter</DButton> -->
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
      
      <RouterLink
        :to="`/competences/${competence.id}`"
        v-for="competence in competences"
        class="grid items-center justify-between gap-4 rounded px-2 py-2 hover:bg-neutral-100"
        :class="search ? 'grid-cols-4' : 'grid-cols-2'"
        :style="{ gridTemplateColumns: search ? '1fr 110px 120px 110px' : '1fr 110px' }"
      >
        <div class="line-clamp-1 text-sm text-neutral-700">
          <span v-if="competence.competenceType === 'competence'">{{ competence.name }}</span>
          <DTag v-else class="w-fit" :color="competence.color ? competence.color : 'gray'">{{ competence.name }}</DTag>
        </div>
        <RouterLink v-if="search && competence.subjectId" :to="`/competences/${competence.subjectId}`" class="line-clamp-1 text-sm text-neutral-700 hover:underline">{{ competence.subjectName }}</RouterLink>
        <RouterLink v-if="search && competence.groupId" :to="`/competences/${competence.groupId}`" class="line-clamp-1 text-sm text-neutral-700 hover:underline">{{ competence.groupName }}</RouterLink>
        <div class="line-clamp-1 text-right text-sm text-neutral-700">
          <template v-if="competence.grades"> {{ competence.grades[0] }} - {{ competence.grades[competence.grades.length - 1] }} </template>
        </div>
      </RouterLink>
    </DPageContent>
  </DPage>
</template>
