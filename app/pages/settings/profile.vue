<script setup lang="ts">
definePageMeta({
  layout: "settings"
})

const currentPassword = ref("")
const newPassword = ref("")
const newPasswordRepeat = ref("")
const errorMsg = ref("")
const successMsg = ref("")
const loading = ref(false)

async function changePassword() {
  errorMsg.value = ""
  successMsg.value = ""

  if (newPassword.value !== newPasswordRepeat.value) {
    errorMsg.value = "Die neuen Passwörter stimmen nicht überein."
    return
  }

  try {
    loading.value = true
    await $fetch("/api/users/change-password", {
      method: "POST",
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value
      }
    })
    successMsg.value = "Passwort erfolgreich geändert."
    currentPassword.value = ""
    newPassword.value = ""
    newPasswordRepeat.value = ""
  } catch (e: any) {
    errorMsg.value = e.statusCode === 401 ? "Das aktuelle Passwort ist falsch." : "Ein unbekannter Fehler ist aufgetreten."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <DPage>
    <DHeader>
      <DHeaderTitle>Profil</DHeaderTitle>
    </DHeader>

    <DPageContent>
      <form @submit.prevent="changePassword" class="flex max-w-sm flex-col gap-4 px-2">
        <div class="text-md font-medium">Passwort ändern</div>
        <div class="flex flex-col gap-1">
          <d-label for="currentPassword">Altes Passwort</d-label>
          <d-input v-model="currentPassword" type="password" id="currentPassword" name="currentPassword" required />
        </div>
        <div class="flex flex-col gap-1">
          <d-label for="newPassword">Neues Passwort</d-label>
          <d-input v-model="newPassword" type="password" id="newPassword" name="newPassword" required minlength="8" />
        </div>
        <div class="flex flex-col gap-1">
          <d-label for="newPasswordRepeat">Neues Passwort wiederholen</d-label>
          <d-input v-model="newPasswordRepeat" type="password" id="newPasswordRepeat" name="newPasswordRepeat" required minlength="8" />
        </div>

        <div v-if="errorMsg" class="rounded-md bg-red-100 px-4 py-2 text-sm text-red-600">{{ errorMsg }}</div>
        <div v-if="successMsg" class="rounded-md bg-green-100 px-4 py-2 text-sm text-green-600">{{ successMsg }}</div>

        <div>
          <d-button :loading type="submit">Passwort ändern</d-button>
        </div>
      </form>
    </DPageContent>
  </DPage>
</template>
