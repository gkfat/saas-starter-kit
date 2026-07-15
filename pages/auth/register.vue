<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="4">
          <v-card-title class="text-h5 mb-4">{{ $t('auth.createAccount') }}</v-card-title>

          <v-form @submit.prevent="handleRegister">
            <v-text-field
              v-model="username"
              :label="$t('auth.username')"
              type="text"
              required
              :disabled="loading"
              :hint="$t('auth.usernameHint')"
              persistent-hint
              class="mb-1"
            />
            <v-text-field
              v-model="email"
              :label="$t('auth.emailOptional')"
              type="email"
              :disabled="loading"
            />
            <v-text-field
              v-model="phone"
              :label="$t('auth.phoneOptional')"
              type="tel"
              :disabled="loading"
            />
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
              {{ $t('auth.register') }}
            </v-btn>
          </v-form>

          <div class="text-center text-body-2">
            {{ $t('auth.hasAccount') }}
            <NuxtLink to="/login">{{ $t('auth.loginLink') }}</NuxtLink>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { isValidUsername, isValidPassword } from '~/shared/utils/validation';

definePageMeta({ layout: 'blank' });

const { register } = useAuth();
const { showError, showSuccess } = useToast();
const router = useRouter();
const { t } = useI18n();

const username = ref('');
const email = ref('');
const phone = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);

async function handleRegister() {
  if (!isValidUsername(username.value)) {
    showError(t('auth.error.invalidUsername'));
    return;
  }
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
    await register(
      username.value,
      password.value,
      email.value || undefined,
      phone.value || undefined,
    );
    showSuccess(t('auth.registerSuccess'));
    router.push('/login');
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
}
</script>
