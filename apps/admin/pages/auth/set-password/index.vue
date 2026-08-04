<template>
  <v-row class="fill-height" no-gutters justify="center" align="center">
    <v-col cols="12" sm="8" md="4">
      <CardsAppCard class="pa-6" elevation="4">
        <v-card-title class="text-h5 mb-4">{{ $t('auth.setPassword') }}</v-card-title>

        <template v-if="!token">
          <p class="text-body-2 text-error">{{ $t('auth.error.invalidSetupToken') }}</p>
        </template>

        <v-form v-else @submit.prevent="onSubmit">
          <v-row no-gutters class="ga-3 flex-column mb-3">
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
                size="large"
                type="submit"
                kind="primary"
                block
                :loading="loading"
                :disabled="!meta.valid"
              >
                {{ $t('auth.setPassword') }}
              </ButtonsAppButton>
            </v-col>
          </v-row>
        </v-form>
      </CardsAppCard>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { isValidPassword } from '@saas-starter-kit/shared';
import { ROUTES } from '~/config/app-routes';

definePageMeta({ path: ROUTES.setPassword });

const route = useRoute();
const router = useRouter();
const { showError, showSuccess } = useToast();
const { t } = useI18n();
const { $api } = useNuxtApp();

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
    await $api('/api/auth/set-password', {
      method: 'POST',
      body: { token: token.value, password: values.password },
    });
    showSuccess(t('auth.setPasswordSuccess'));
    router.push(ROUTES.login);
  } catch {
    showError(t('auth.error.invalidSetupToken'));
  } finally {
    loading.value = false;
  }
});
</script>
