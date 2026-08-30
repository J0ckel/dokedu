<script setup lang="ts">
import { XIcon } from "lucide-vue-next"
import type { DUserCompetence } from "~/types/models"

interface Props {
  userCompetence: DUserCompetence
  studentName: string
}

const { userCompetence, studentName } = defineProps<Props>()

const competence = ref(null)
const parents = ref([])

const emit = defineEmits(["remove", "levelChange"])

function upgradeLevel() {
  const level = userCompetence.level >= 3 ? 0 : userCompetence.level + 1
  emit("levelChange", level, userCompetence.userId)
}

function removeCurrent() {
  emit("remove", userCompetence.competence, userCompetence.userId)
}

// bg-red-100 bg-orange-100 bg-amber-100 bg-yellow-100 bg-lime-100 bg-green-100 bg-emerald-100 bg-teal-100 bg-cyan-100 bg-sky-100 bg-blue-100 bg-indigo-100 bg-violet-100 bg-purple-100 bg-fuchsia-100 bg-pink-100 bg-rose-100
// text-red-800 text-orange-800 text-amber-800 text-yellow-800 text-lime-800 text-green-800 text-emerald-800 text-teal-800 text-cyan-800 text-sky-800 text-blue-800 text-indigo-800 text-violet-800 text-purple-800 text-fuchsia-800 text-pink-800 text-rose-800
</script>

<template>
  <div v-if="userCompetence" class="flex flex-col gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2">
    <div class="flex min-w-0 items-center gap-2">
      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 items-center gap-2">
          <span class="w-44 shrink-0 break-words text-sm font-medium text-neutral-800">
            {{ studentName }}
          </span>
          <div class="flex min-w-0 flex-1 items-center gap-1 text-sm text-neutral-700">
            <span class="shrink-0 text-neutral-500">Kompetenz:</span>
            <span class="min-w-0 truncate font-medium text-neutral-800">{{ userCompetence.competence.name }}</span>
            <span v-if="userCompetence.deletedAt !== null" class="shrink-0">- deleted</span>
          </div>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button type="button" class="flex size-7 items-center justify-center rounded-md bg-blue-600 text-sm font-medium text-white shadow-sm hover:bg-blue-700" @click="upgradeLevel">
          {{ userCompetence.level }}
        </button>
        <DButton :icon-left="XIcon" variant="secondary" class="!px-1" @click="removeCurrent" />
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <template v-for="(parent, index) in parents" :key="parent.id">
        <div class="text-neutral-300" v-if="index !== 0">{{ "/" }}</div>
        <DTag size="small" :color="parent.color ?? 'gray'">{{ parent.name }}</DTag>
      </template>
    </div>
  </div>
</template>
