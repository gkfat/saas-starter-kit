<template>
  <v-dialog :model-value="modelValue" max-width="400" persistent @update:model-value="close">
    <v-card>
      <v-card-title class="pa-4">{{ $t('users.deleteUser') }}</v-card-title>
      <v-card-text>
        {{ $t('users.deleteConfirm', { username: user?.username }) }}
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="flat" class="border" @click="close">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="error" variant="flat" :loading="deleting" @click="confirm">{{
          $t('common.confirm')
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import type { UserRow } from '~/shared/users';

const props = defineProps<{
  modelValue: boolean;
  user: UserRow | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirmed: [];
}>();

const auth = useAuthStore();
const { t } = useI18n();
const { showSuccess } = useToast();
const { withErrorToast } = useApiError();

const deleting = ref(false);

function close() {
  emit('update:modelValue', false);
}

async function confirm() {
  if (!props.user) return;
  deleting.value = true;
  const result = await withErrorToast(() =>
    $fetch<unknown>(`/api/admin/users/${props.user!.uid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.idToken}` },
    }),
  );
  if (result !== null) {
    close();
    showSuccess(t('users.deleteSuccess'));
    emit('confirmed');
  }
  deleting.value = false;
}
</script>
