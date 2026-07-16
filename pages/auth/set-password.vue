<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="4">
          <v-card-title class="text-h5 mb-4">{{ $t('auth.setPassword') }}</v-card-title>

          <template v-if="!token">
            <p class="text-body-2 text-error">{{ $t('auth.error.invalidSetupToken') }}</p>
          </template>

          <v-form v-else @submit.prevent="handleSubmit">
            <v-text-field
              v-model="password"
              :label="$t('auth.password')"
              type="password"
              required
              :disabled="loading"
              :hint="$t('auth.passwordHint')"
              persistent-hint
              class="mb-1"
            />
            <v-text-field
              v-model="confirmPassword"
              :label="$t('auth.confirmPassword')"
              type="password"
              required
              :disabled="loading"
            />
            <v-btn type="submit" color="primary" block :loading="loading" class="mb-3 mt-2">
              {{ $t('auth.setPassword') }}
            </v-btn>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { isValidPassword } from '~/shared/utils/validation';

definePageMeta({ layout: 'blank' });

const route = useRoute();
const router = useRouter();
const { showError, showSuccess } = useToast();
const { t } = useI18n();

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));

const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);

async function handleSubmit() {
  if (!isValidPassword(password.value)) {
    showError(t('auth.error.invalidPassword'));
    return;
  }
  if (password.value !== confirmPassword.value) {
    showError(t('auth.passwordMismatch'));
    return;
  }

  loading.value = true;
  try {
    await $fetch('/api/auth/set-password', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    });
    showSuccess(t('auth.setPasswordSuccess'));
    router.push('/login');
  } catch {
    showError(t('auth.error.invalidSetupToken'));
  } finally {
    loading.value = false;
  }
}
</script>
