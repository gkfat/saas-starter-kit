<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="4">
          <v-card-title class="text-h5 mb-4">{{ $t('auth.login') }}</v-card-title>

          <v-form @submit.prevent="handleEmailLogin">
            <v-text-field
              v-model="email"
              :label="$t('auth.email')"
              type="email"
              required
              :disabled="loading"
            />
            <v-text-field
              v-model="password"
              :label="$t('auth.password')"
              type="password"
              required
              :disabled="loading"
            />
            <v-btn type="submit" color="primary" block :loading="loading" class="mb-3">
              {{ $t('auth.login') }}
            </v-btn>
          </v-form>

          <v-divider class="my-4" />

          <v-btn
            block
            variant="outlined"
            :loading="loading"
            class="mb-3"
            @click="handleGoogleLogin"
          >
            <v-icon start>mdi-google</v-icon>
            {{ $t('auth.loginWithGoogle') }}
          </v-btn>

          <div class="text-center text-body-2 mt-2">
            {{ $t('auth.noAccount') }}
            <NuxtLink to="/auth/register">{{ $t('auth.registerLink') }}</NuxtLink>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank', path: '/login' });

const { loginWithEmail, loginWithGoogle } = useAuth();
const { showError } = useToast();
const router = useRouter();
const { t } = useI18n();

const email = ref('');
const password = ref('');
const loading = ref(false);

function getLoginErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': t('auth.error.invalidCredential'),
    'auth/wrong-password': t('auth.error.invalidCredential'),
    'auth/user-not-found': t('auth.error.invalidCredential'),
    'auth/invalid-email': t('auth.error.invalidEmail'),
    'auth/user-disabled': t('auth.error.userDisabled'),
    'auth/too-many-requests': t('auth.error.tooManyRequests'),
  };
  return map[code] ?? t('auth.error.default');
}

async function handleEmailLogin() {
  loading.value = true;
  try {
    await loginWithEmail(email.value, password.value);
    router.push('/dashboard');
  } catch (e: unknown) {
    showError(getLoginErrorMessage(e));
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  loading.value = true;
  try {
    await loginWithGoogle();
    router.push('/dashboard');
  } catch (e: unknown) {
    showError(getLoginErrorMessage(e));
  } finally {
    loading.value = false;
  }
}
</script>
