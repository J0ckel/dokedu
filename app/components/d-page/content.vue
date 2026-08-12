<script setup lang="ts">
const content = useTemplateRef<HTMLElement>("content")

defineExpose({
  scrollElement: content
})
</script>

<template>
  <div ref="content" class="flex flex-1 flex-col overflow-x-hidden overflow-y-auto p-2 pt-2 sm:p-4 sm:pt-2">
    <slot></slot>
  </div>
</template>
