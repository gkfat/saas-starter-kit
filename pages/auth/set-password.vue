<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="4">
          <v-card-title class="text-h5 mb-4">{{ $t('auth.setPassword') }}</v-card-title>

          <template v-if="!token">
            <p class="text-body-2 text-error">{{ $t('auth.error.invalidSetupToken') }}</p>
          </template>

          <v-form v-else @submit.prevent="onSubmit">
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
              class="mb-1"
            />
            <v-text-field
              v-model="confirmPassword"
              v-bind="confirmPasswordAttrs"
              :label="$t('auth.confirmPassword')"
              type="password"
              :error-messages="errors.confirmPassword"
              :disabled="loading"
              hide-details="auto"
              class="mb-1"
            />
            <v-btn
              type="submit"
              color="primary"
              variant="flat"
              block
              :loading="loading"
              :disabled="!meta.valid"
              class="mb-3 mt-2"
            >
              {{ $t('auth.setPassword') }}
            </v-btn>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { isValidPassword } from '~/shared/utils/validation';

definePageMeta({ layout: 'blank' });

const route = useRoute();
const router = useRouter();
const { showError, showSuccess } = useToast();
const { t } = useI18n();

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));

const loading = ref(false);

const validationSchema = toTypedSchema(
  z
    .object({
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
  initialValues: { password: '', confirmPassword: '' },
});

const [password, passwordAttrs] = defineField('password');
const [confirmPassword, confirmPasswordAttrs] = defineField('confirmPassword');

const onSubmit = handleSubmit(async (values) => {
  loading.value = true;
  try {
    await $fetch('/api/auth/set-password', {
      method: 'POST',
      body: { token: token.value, password: values.password },
    });
    showSuccess(t('auth.setPasswordSuccess'));
    router.push('/login');
  } catch {
    showError(t('auth.error.invalidSetupToken'));
  } finally {
    loading.value = false;
  }
});
</script>
