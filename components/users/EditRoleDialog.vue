<template>
  <v-dialog :model-value="modelValue" max-width="400" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ $t('users.editRole') }} — {{ user?.username }}</v-card-title>
      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-1">{{ $t('users.role') }}</div>
        <v-select
          v-model="selectedRole"
          v-bind="selectedRoleAttrs"
          :items="roleOptions"
          item-title="title"
          item-value="value"
          :error-messages="errors.selectedRole"
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
        <ButtonsAppButton kind="secondary" @click="close">{{
          $t('common.cancel')
        }}</ButtonsAppButton>
        <ButtonsAppButton kind="primary" :loading="saving" :disabled="!meta.valid" @click="save">{{
          $t('common.save')
        }}</ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import type { UserRow } from '~/shared/users';
import type { OkResponse } from '~/shared/dto/common';

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

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();

const saving = ref(false);

const validationSchema = toTypedSchema(
  z.object({
    selectedRole: z.string().min(1),
  }),
);

const { defineField, errors, meta, resetForm } = useForm({
  validationSchema,
  initialValues: { selectedRole: '' },
});

const [selectedRole, selectedRoleAttrs] = defineField('selectedRole');

const selectedRolePermissions = computed(
  () => props.rolePermissions[selectedRole.value ?? ''] ?? [],
);

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm({ values: { selectedRole: props.user?.role ?? '' } });
  },
);

function close() {
  emit('update:modelValue', false);
}

async function save() {
  if (!props.user) return;
  saving.value = true;
  const result = await apiFetch<OkResponse>(`/api/admin/users/${props.user.uid}`, {
    method: 'PATCH',
    body: { role: selectedRole.value },
  });
  if (result !== null) {
    close();
    showSuccess(t('users.updateRoleSuccess'));
    emit('saved');
  }
  saving.value = false;
}
</script>
