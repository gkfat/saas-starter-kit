<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ dialogTitle }}</v-card-title>
      <v-card-text>
        <v-row dense class="flex-column">
          <v-col>
            <v-text-field
              v-model="username"
              v-bind="usernameAttrs"
              :label="$t('auth.username')"
              :hint="$t('auth.usernameHint')"
              :error-messages="errors.username"
              hide-details="auto"
              :disabled="creating"
            />
          </v-col>
          <v-col>
            <v-text-field
              v-model="displayName"
              v-bind="displayNameAttrs"
              :label="$t('users.displayNameOptional')"
              :disabled="creating"
              hide-details="auto"
            />
          </v-col>
          <v-col>
            <v-text-field
              v-model="email"
              v-bind="emailAttrs"
              :label="$t('auth.emailOptional')"
              type="email"
              :error-messages="errors.email"
              :disabled="creating"
              hide-details="auto"
            />
          </v-col>
          <v-col>
            <v-text-field
              v-model="phone"
              v-bind="phoneAttrs"
              :label="$t('auth.phoneOptional')"
              type="tel"
              :disabled="creating"
              hide-details="auto"
            />
          </v-col>
          <v-col v-if="mode === 'admin-account'">
            <div class="text-caption text-medium-emphasis mb-1">{{ $t('users.role') }}</div>
            <v-select
              v-model="role"
              v-bind="roleAttrs"
              :items="assignableRoleOptions"
              item-title="title"
              item-value="value"
              :error-messages="errors.role"
              hide-details="auto"
            />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" @click="close">{{
          $t('common.cancel')
        }}</ButtonsAppButton>
        <ButtonsAppButton
          kind="primary"
          :loading="creating"
          :disabled="!meta.valid"
          @click="onSubmit"
          >{{ $t('common.create') }}</ButtonsAppButton
        >
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { useAuthStore } from '~/stores/auth';
import { Role } from '~/shared/roles';
import { isValidUsername } from '~/shared/utils/validation';

const props = defineProps<{
  modelValue: boolean;
  mode: 'member' | 'admin-account';
  roleOptions: Array<{ title: string; value: string }>;
}>();

const assignableRoleOptions = computed(() =>
  props.roleOptions.filter((option) => option.value !== Role.Member),
);

const defaultRole = computed(() =>
  props.mode === 'member' ? Role.Member : (assignableRoleOptions.value[0]?.value ?? Role.Admin),
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  created: [setupLink: string];
}>();

const auth = useAuthStore();
const { t } = useI18n();
const { showSuccess, showError } = useToast();

const dialogTitle = computed(() =>
  props.mode === 'member' ? t('users.createMember') : t('users.createAdminAccount'),
);

const creating = ref(false);

const validationSchema = toTypedSchema(
  z.object({
    username: z.string().refine(isValidUsername, t('auth.error.invalidUsername')),
    displayName: z.string().optional(),
    email: z.union([z.string().email(t('auth.error.invalidEmail')), z.literal('')]).optional(),
    phone: z.string().optional(),
    role: z.string().min(1, t('auth.error.registerDefault')),
  }),
);

const { defineField, errors, meta, handleSubmit, resetForm } = useForm({
  validationSchema,
  initialValues: { username: '', displayName: '', email: '', phone: '', role: '' },
});

const [username, usernameAttrs] = defineField('username');
const [displayName, displayNameAttrs] = defineField('displayName');
const [email, emailAttrs] = defineField('email');
const [phone, phoneAttrs] = defineField('phone');
const [role, roleAttrs] = defineField('role');

watch(
  () => props.modelValue,
  (open) => {
    if (open)
      resetForm({
        values: { username: '', displayName: '', email: '', phone: '', role: defaultRole.value },
      });
  },
);

function close() {
  emit('update:modelValue', false);
}

const onSubmit = handleSubmit(async (values) => {
  creating.value = true;
  try {
    const { setupLink } = await $fetch<{ uid: string; setupLink: string }>('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.idToken}` },
      body: {
        username: values.username,
        displayName: values.displayName || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        role: values.role,
      },
    });
    close();
    showSuccess(t('users.createSuccess'));
    emit('created', setupLink);
  } catch (e: unknown) {
    const statusCode = (e as { data?: { statusCode?: number } }).data?.statusCode;
    if (statusCode === 409) {
      showError(t('auth.error.usernameTaken'));
    } else {
      showError(t('auth.error.registerDefault'));
    }
  } finally {
    creating.value = false;
  }
});
</script>
