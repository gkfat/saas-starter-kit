<template>
  <v-dialog :model-value="modelValue" max-width="400" persistent @update:model-value="close">
    <v-card>
      <v-card-title class="pa-4">{{ $t('users.editRole') }} — {{ user?.username }}</v-card-title>
      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-1">{{ $t('users.role') }}</div>
        <v-select
          v-model="selectedRole"
          :items="roleOptions"
          item-title="title"
          item-value="value"
          hide-details="auto"
        />
        <div class="mt-3">
          <v-chip
            v-for="perm in selectedRolePermissions"
            :key="perm"
            size="small"
            label
            class="mr-1 mb-1"
          >
            {{ $t(`permission.${perm}`) }}
          </v-chip>
        </div>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="flat" class="border" @click="close">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="save">{{
          $t('common.save')
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
  roleOptions: Array<{ title: string; value: string }>;
  rolePermissions: Record<string, string[]>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [];
}>();

const auth = useAuthStore();
const { t } = useI18n();
const { showSuccess } = useToast();
const { withErrorToast } = useApiError();

const saving = ref(false);
const selectedRole = ref('');

const selectedRolePermissions = computed(() => props.rolePermissions[selectedRole.value] ?? []);

watch(
  () => props.modelValue,
  (open) => {
    if (open) selectedRole.value = props.user?.role ?? '';
  },
);

function close() {
  emit('update:modelValue', false);
}

async function save() {
  if (!props.user) return;
  saving.value = true;
  const result = await withErrorToast(() =>
    $fetch<unknown>(`/api/admin/users/${props.user!.uid}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${auth.idToken}` },
      body: { role: selectedRole.value },
    }),
  );
  if (result !== null) {
    close();
    showSuccess(t('users.updateRoleSuccess'));
    emit('saved');
  }
  saving.value = false;
}
</script>
