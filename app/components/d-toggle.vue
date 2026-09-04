<script setup lang="ts">
const model = defineModel<boolean>({ default: false })
</script>

<template>
  <label class="flex cursor-pointer items-center gap-3 text-sm text-neutral-800">
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
      :class="model ? 'border-blue-600 bg-blue-600' : 'border-neutral-300 bg-neutral-200'"
      @click="model = !model"
    >
      <span
        class="inline-block size-4 rounded-full bg-white shadow-sm transition-transform"
        :class="model ? 'translate-x-6' : 'translate-x-1'"
      />
    </button>
    <span><slot /></span>
  </label>
</template>
