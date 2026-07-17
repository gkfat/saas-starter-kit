<template>
  <v-form @submit.prevent="onSubmit">
    <v-row no-gutters class="ga-3 flex-column">
      <v-col>
        <v-text-field
          v-model="username"
          v-bind="usernameAttrs"
          :label="$t('auth.username')"
          type="text"
          :error-messages="errors.username"
          :disabled="loading"
          :hint="$t('auth.usernameHint')"
          persistent-hint
          hide-details="auto"
        />
      </v-col>
      <v-col>
        <v-text-field
          v-model="password"
          v-bind="passwordAttrs"
          :label="$t('auth.password')"
          type="password"
          :error-messages="errors.password"
          :disabled="loading"
          :hint="$t('auth.passwordHint')"
          persistent-hint
          hide-details="auto"
        />
      </v-col>
      <v-col>
        <v-text-field
          v-model="confirmPassword"
          v-bind="confirmPasswordAttrs"
          :label="$t('auth.confirmPassword')"
          type="password"
          :error-messages="errors.confirmPassword"
          :disabled="loading"
          hide-details="auto"
        />
      </v-col>
      <v-col>
        <ButtonsAppButton
          type="submit"
          kind="primary"
          size="x-large"
          block
          :loading="loading"
          :disabled="!meta.valid"
        >
          {{ $t('auth.register') }}
        </ButtonsAppButton>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { isValidUsername, isValidPassword } from '~/shared/utils/validation';

const emit = defineEmits<{
  success: [];
}>();

const { register } = useAuth();
const { showError, showSuccess } = useToast();
const { t } = useI18n();

const loading = ref(false);

const validationSchema = toTypedSchema(
  z
    .object({
      username: z.string().refine(isValidUsername, t('auth.error.invalidUsername')),
      password: z.string().refine(isValidPassword, t('auth.error.invalidPassword')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.passwordMismatch'),
      path: ['confirmPassword'],
    }),
);

const { defineField, errors, meta, handleSubmit } = useForm({
  validationSchema,
  initialValues: { username: '', password: '', confirmPassword: '' },
});

const [username, usernameAttrs] = defineField('username');
const [password, passwordAttrs] = defineField('password');
const [confirmPassword, confirmPasswordAttrs] = defineField('confirmPassword');

const onSubmit = handleSubmit(async (values) => {
  loading.value = true;
  try {
    await register(values.username, values.password);
    showSuccess(t('auth.registerSuccess'));
    emit('success');
  } catch (e: unknown) {
    const statusCode = (e as { data?: { statusCode?: number } }).data?.statusCode;
    if (statusCode === 409) {
      showError(t('auth.error.usernameTaken'));
    } else {
      showError(t('auth.error.registerDefault'));
    }
  } finally {
    loading.value = false;
  }
});
</script>
