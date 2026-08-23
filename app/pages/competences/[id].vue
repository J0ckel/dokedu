<script setup lang="ts">
const { user } = useUserSession()
const canManage = computed(() => user.value?.role === "admin" || user.value?.role === "owner")
const route = useRoute()
const id = computed(() => route.params.id)

const search = ref("")

const { data: competences, refresh } = await useFetch("/api/competences", {
  params: {
    search: search,
    competenceId: id,
  },
  watch: [search, id]
})

const parent = await $fetch<{ name: string; competenceType: string; competenceId: string | null }>(`/api/competences/${id.value}`)
const showGroup = parent.competenceType === "group"
const groupName = showGroup ? parent.name : undefined
const groupId = showGroup ? id.value : undefined
</script>

<template>
  <DPage>
    <DHeader>
      <DHeaderTitle>Kompetenzen - {{ parent.name }}</DHeaderTitle>
      <DInputSearch v-model="search" />
      <template #right>
        <DCompetenceEditor v-if="canManage" :parent-id="id as string" @saved="refresh" />
      </template>
    </DHeader>

    <div class="block min-h-0 px-4 pt-2.5">
      <div class="grid items-center justify-between gap-4 border-b border-neutral-200 px-2 pb-2" :class="showGroup ? 'grid-cols-4' : 'grid-cols-3'" :style="{ gridTemplateColumns: showGroup ? '1fr 110px 120px 110px' : '1fr 110px 110px' }">
        <div class="border-r border-neutral-200 text-sm font-medium text-neutral-900">Name</div>
        <div class="border-r border-neutral-200 text-sm font-medium text-neutral-900">Fach</div>
        <div v-if="showGroup" class="border-r border-neutral-200 text-sm font-medium text-neutral-900">Gruppe</div>
        <div class="border-r border-neutral-200 text-sm font-medium text-neutral-900">Klassenstufen</div>
      </div>
    </div>

    <DPageContent>
      <div
        v-for="competence in competences"
        class="grid items-center justify-between gap-4 rounded px-2 py-2 hover:bg-neutral-100"
        :class="showGroup ? 'grid-cols-4' : 'grid-cols-3'"
        :style="{ gridTemplateColumns: showGroup ? '1fr 110px 120px 110px' : '1fr 110px 110px' }"
      >
        <NuxtLink :to="competence.competenceType === 'competence' ? undefined : `/competences/${competence.id}`" class="line-clamp-1 text-sm text-neutral-700 cursor-default">
          <span v-if="competence.competenceType === 'competence'" class="cursor-default">{{ competence.name }}</span>
          <DTag v-else class="w-fit cursor-default" :color="`gray`">{{ competence.name }}</DTag>
        </NuxtLink>
        <RouterLink v-if="competence.subjectId" :to="`/competences/${competence.subjectId}`" class="inline-flex max-w-full items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900">{{ competence.subjectName }}</RouterLink>
        <RouterLink v-if="showGroup && (groupId || competence.groupId)" :to="`/competences/${groupId || competence.groupId}`" class="inline-flex max-w-full items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900">{{ groupName || competence.groupName }}</RouterLink>
        <div class="line-clamp-1 text-right text-sm text-neutral-700">
          <template v-if="competence.grades"> {{ competence.grades[0] }} - {{ competence.grades[competence.grades.length - 1] }} </template>
        </div>
        <DCompetenceEditor v-if="canManage" class="justify-end" :class="showGroup ? 'col-span-4' : 'col-span-3'" :competence="competence" @saved="refresh" @deleted="refresh" />
      </div>
    </DPageContent>
  </DPage>
</template>
