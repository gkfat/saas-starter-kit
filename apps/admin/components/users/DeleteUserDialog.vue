<template>
  <v-dialog :model-value="modelValue" max-width="400" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ $t('users.deleteUser') }}</v-card-title>
      <v-card-text>
        {{ $t('users.deleteConfirm', { username: user?.username }) }}
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" @click="close">{{
          $t('common.cancel')
        }}</ButtonsAppButton>
        <ButtonsAppButton kind="primary" color="error" :loading="deleting" @click="confirm">{{
          $t('common.confirm')
        }}</ButtonsAppButton>
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

const deleting = ref(false);

function close() {
  emit('update:modelValue', false);
}

async function confirm() {
  if (!props.user) return;
  deleting.value = true;
  const result = await apiFetch<OkResponse>(`/api/admin/users/${props.user.uid}`, {
    method: 'DELETE',
  });
  if (result !== null) {
    close();
    showSuccess(t('users.deleteSuccess'));
    emit('confirmed');
  }
  deleting.value = false;
}
</script>
