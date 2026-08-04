<template>
  <v-dialog :model-value="modelValue" max-width="400" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{
        user?.disabled ? $t('users.enableUser') : $t('users.disableUser')
      }}</v-card-title>
      <v-card-text>
        {{ $t('users.disableConfirm', { username: user?.username }) }}
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" @click="close">{{
          $t('common.cancel')
        }}</ButtonsAppButton>
        <ButtonsAppButton
          kind="primary"
          :color="user?.disabled ? 'success' : 'error'"
          :loading="saving"
          @click="confirm"
          >{{
            user?.disabled ? $t('users.confirmEnable') : $t('users.confirmDisable')
          }}</ButtonsAppButton
        >
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import type { UserRow, OkResponse } from '@saas-starter-kit/shared';

const props = defineProps<{
  modelValue: boolean;
  user: UserRow | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirmed: [];
}>();

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();

const saving = ref(false);

function close() {
  emit('update:modelValue', false);
}

async function confirm() {
  if (!props.user) return;
  saving.value = true;
  const result = await apiFetch<OkResponse>(`/api/admin/users/${props.user.userId}`, {
    method: 'PATCH',
    body: { disabled: !props.user.disabled },
  });
  if (result !== null) {
    close();
    showSuccess(t('users.updateStatusSuccess'));
    emit('confirmed');
  }
  saving.value = false;
}
</script>
