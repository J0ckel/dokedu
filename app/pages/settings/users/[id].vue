<script setup lang="ts">
import { onKeyDown } from "@vueuse/core"

const route = useRoute()
const { user: currentUser } = useUserSession()
const canArchive = computed(() => currentUser.value?.role === "owner" || currentUser.value?.role === "admin")

const { data } = await useFetch(`/api/users/${route.params.id}`)

const firstName = ref(data.value?.firstName)
const lastName = ref(data.value?.lastName)
const email = ref(data.value?.email)
const role = ref(data.value?.role)

const roleOptions = [
  { value: "owner", display: "Besitzer" },
  { value: "admin", display: "Admin" },
  { value: "teacher", display: "Lehrer" },
  { value: "competence_admin", display: "Kompetenz-Admin" }
]

const container = useTemplateRef<HTMLElement>("container")

onClickOutside(container, () => navigateTo("/settings/users"))
onKeyDown("Escape", () => navigateTo("/settings/users"))

async function onFormSubmit() {
  try {
    await $fetch(`/api/users/${route.params.id}`, {
      method: "PUT",
      body: {
        firstName: firstName.value,
        lastName: lastName.value,
        role: role.value
      }
    })
    navigateTo("/settings/users")
  } catch (error) {
    console.error("Failed to update user:", error)
    // Consider showing a toast notification here to inform the user
  }
}

const showArchiveModal = ref(false)

async function archive() {
  showArchiveModal.value = false
  await $fetch(`/api/users/${route.params.id}`, { method: "DELETE" })
  await navigateTo("/settings/users")
}

function archiveModal() {
  showArchiveModal.value = true
}

const setupLink = ref("")
const copied = ref(false)

async function requestSetupLink() {
  copied.value = false
  const result = await $fetch<{ setupLink: string }>(`/api/users/${route.params.id}/setup-link`, { method: "POST" })
  setupLink.value = result.setupLink
}

async function copyLink() {
  await navigator.clipboard.writeText(setupLink.value)
  copied.value = true
}
</script>

<template>
  <div ref="container" class="absolute top-0 right-0 h-screen w-[400px] border-l border-neutral-200 bg-white p-4 shadow-lg">
    <form @submit.prevent="onFormSubmit">
      <div class="text-md mb-4 font-medium">Benutzer bearbeiten</div>
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
        <d-input id="email" class="w-full" v-model="email" type="email" name="email" required disabled />
      </div>
      <div class="mb-4">
        <d-label for="role">Rolle</d-label>
        <d-select v-model="role" :options="roleOptions" name="role" required placeholder="Wähle eine Rolle" />
      </div>

      <div v-if="canArchive" class="mb-4 border-t border-neutral-200 pt-4">
        <d-button variant="secondary" type="button" @click="requestSetupLink">Setup-Link anfordern</d-button>
        <div v-if="setupLink" class="mt-2">
          <p class="mb-2 text-xs text-neutral-500">
            Gib diesen Link an den Benutzer weiter, damit ein neues Passwort festgelegt werden kann. Gültig für 24 Stunden.
          </p>
          <div class="mb-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-xs break-all">{{ setupLink }}</div>
          <d-button variant="secondary" type="button" @click="copyLink">{{ copied ? "Kopiert!" : "Link kopieren" }}</d-button>
        </div>
      </div>

      <div class="flex items-center justify-between gap-2">
        <d-button v-if="canArchive" variant="danger-light" @click="archiveModal">Archivieren</d-button>
        <div v-else></div>
        <d-button type="submit">Speichern</d-button>
      </div>
    </form>

    <DModal titel="Archivieren" v-if="showArchiveModal" @close="showArchiveModal = false" confirm-text="Archivieren" @confirm="archive">
      <div class="p-4 text-sm text-neutral-500">Möchtest du diesen Benutzer wirklich archivieren?</div>
    </DModal>
  </div>
</template>
