<script setup lang="ts">
import { onKeyDown } from "@vueuse/core"

const firstName = ref("")
const lastName = ref("")
const email = ref("")
const role = ref<any>(null)

const setupLink = ref("")
const copied = ref(false)

const roleOptions = [
  { value: "admin", display: "Admin" },
  { value: "teacher", display: "Lehrer" }
]

const container = useTemplateRef<HTMLElement>("container")

onClickOutside(container, () => {
  if (!setupLink.value) navigateTo("/settings/users")
})
onKeyDown("Escape", () => {
  if (!setupLink.value) navigateTo("/settings/users")
})

async function onFormSubmit() {
  try {
    const result = await $fetch<{ setupLink?: string }>("/api/users", {
      method: "POST",
      body: {
        firstName: firstName.value,
        lastName: lastName.value,
        email: email.value,
        role: role.value
      }
    })
    setupLink.value = result.setupLink ?? ""
  } catch (error) {
    console.error("Failed to create user:", error)
    // Consider showing a toast notification here to inform the user
  }
}

async function copyLink() {
  await navigator.clipboard.writeText(setupLink.value)
  copied.value = true
}

function done() {
  navigateTo("/settings/users")
}
</script>

<template>
  <div ref="container" class="absolute top-0 right-0 h-screen w-[400px] border-l border-neutral-200 bg-white p-4 shadow-lg">
    <form v-if="!setupLink" @submit.prevent="onFormSubmit">
      <div class="text-md mb-4 font-medium">Neuen Benutzer erstellen</div>
      <div class="mb-4">
        <d-label for="firstName">Vorname</d-label>
        <d-input id="firstName" class="w-full" v-model="firstName" type="text" name="firstName" required />
      </div>
      <div class="mb-4">
        <d-label for="lastName">Nachname</d-label>
        <d-input id="lastName" class="w-full" v-model="lastName" type="text" name="lastName" required />
      </div>
      <div class="mb-4">
        <d-label for="email">E-Mail</d-label>
        <d-input id="email" class="w-full" v-model="email" type="email" name="email" required />
      </div>
      <div class="mb-4">
        <d-label for="role">Rolle</d-label>
        <d-select v-model="role" :options="roleOptions" name="role" required placeholder="Wähle eine Rolle" />
      </div>
      <div class="mb-4">
        <p class="text-xs text-neutral-500">Nach dem Erstellen erhältst du einen Link, über den der Benutzer sein Passwort festlegen kann.</p>
      </div>
      <div class="flex items-center justify-end gap-2">
        <d-button type="submit">Erstellen</d-button>
      </div>
    </form>

    <div v-else>
      <div class="text-md mb-4 font-medium">Benutzer erstellt</div>
      <p class="mb-2 text-xs text-neutral-500">
        Gib diesen Link an {{ firstName }} weiter, damit ein Passwort festgelegt werden kann. Der Link ist 24 Stunden gültig.
      </p>
      <div class="mb-4 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-xs break-all">{{ setupLink }}</div>
      <div class="flex items-center justify-end gap-2">
        <d-button variant="secondary" @click="copyLink">{{ copied ? "Kopiert!" : "Link kopieren" }}</d-button>
        <d-button @click="done">Fertig</d-button>
      </div>
    </div>
  </div>
</template>

