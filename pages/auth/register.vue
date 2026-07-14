<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="4">
          <v-card-title class="text-h5 mb-4">{{ $t('auth.createAccount') }}</v-card-title>

          <v-form @submit.prevent="handleRegister">
            <v-text-field
              v-model="displayName"
              :label="$t('auth.displayName')"
              type="text"
              required
              :disabled="loading"
            />
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
            <v-text-field
              v-model="confirmPassword"
              :label="$t('auth.confirmPassword')"
              type="password"
              required
              :disabled="loading"
            />
            <v-btn type="submit" color="primary" block :loading="loading" class="mb-3">
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
definePageMeta({ layout: 'blank' });

const { register } = useAuth();
const { showError } = useToast();
const router = useRouter();
const { t } = useI18n();

const displayName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'auth.error.emailAlreadyInUse',
  'auth/invalid-email': 'auth.error.invalidEmail',
  'auth/weak-password': 'auth.error.weakPassword',
};

async function handleRegister() {
  if (password.value !== confirmPassword.value) {
    showError(t('auth.passwordMismatch'));
    return;
  }

  loading.value = true;
  try {
    await register(displayName.value, email.value, password.value);
    router.push('/login');
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? '';
    const key = FIREBASE_ERROR_MESSAGES[code] ?? 'auth.error.registerDefault';
    showError(t(key));
  } finally {
    loading.value = false;
  }
}
</script>
