<template>
  <v-dialog :model-value="isOpen" max-width="400" persistent>
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ $t('auth.sessionExpiredTitle') }}</v-card-title>
      <v-card-text>{{ $t('auth.sessionExpiredMessage') }}</v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="primary" :loading="loggingOut" @click="confirm">{{
          $t('common.confirm')
        }}</ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
const { isOpen, close } = useSessionExpiredDialog();
const { logout } = useAuth();

const loggingOut = ref(false);

async function confirm() {
  loggingOut.value = true;
  await logout();
  close();
  loggingOut.value = false;
  await navigateTo('/login');
}
</script>
