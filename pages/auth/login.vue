<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="4">
          <!-- Quick-register form (Google flow) -->
          <template v-if="quickRegister">
            <v-card-title class="text-h5 mb-2">{{ $t('auth.chooseUsername') }}</v-card-title>
            <v-card-subtitle class="mb-4">{{ quickRegister.googleEmail }}</v-card-subtitle>
            <v-form @submit.prevent="handleGoogleRegister">
              <v-text-field
                v-model="newUsername"
                :label="$t('auth.username')"
                type="text"
                required
                :disabled="loading"
                :hint="$t('auth.usernameHint')"
                persistent-hint
                class="mb-2"
              />
              <v-btn type="submit" color="primary" block :loading="loading" class="mb-3">
                {{ $t('auth.confirmUsername') }}
              </v-btn>
            </v-form>
            <v-btn variant="text" block :disabled="loading" @click="cancelQuickRegister">
              {{ $t('common.cancel') }}
            </v-btn>
          </template>

          <!-- Normal login form -->
          <template v-else>
            <v-card-title class="text-h5 mb-4">{{ $t('auth.login') }}</v-card-title>

            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="identifier"
                :label="$t('auth.identifier')"
                type="text"
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
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank', path: '/login' });

const { login, loginWithGoogle, googleRegister } = useAuth();
const { showError } = useToast();
const router = useRouter();
const { t } = useI18n();

const identifier = ref('');
const password = ref('');
const newUsername = ref('');
const loading = ref(false);

type QuickRegisterState = { googleEmail: string; displayName: string | null; idToken: string };
const quickRegister = ref<QuickRegisterState | null>(null);

function getLoginErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': t('auth.error.invalidCredential'),
    'auth/wrong-password': t('auth.error.invalidCredential'),
    'auth/user-not-found': t('auth.error.invalidCredential'),
    'auth/invalid-email': t('auth.error.invalidCredential'),
    'auth/user-disabled': t('auth.error.userDisabled'),
    'auth/too-many-requests': t('auth.error.tooManyRequests'),
  };
  return map[code] ?? t('auth.error.default');
}

async function handleLogin() {
  loading.value = true;
  try {
    await login(identifier.value, password.value);
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
    const result = await loginWithGoogle();
    if (result.status === 'ready') {
      router.push('/dashboard');
    } else {
      quickRegister.value = {
        googleEmail: result.googleEmail,
        displayName: result.displayName,
        idToken: result.idToken,
      };
      username.value = '';
    }
  } catch (e: unknown) {
    const statusCode =
      (e as { data?: { statusCode?: number }; status?: number }).data?.statusCode ??
      (e as { status?: number }).status;
    if (statusCode === 409) {
      showError(t('auth.error.googleEmailConflict'));
    } else {
      showError(getLoginErrorMessage(e));
    }
  } finally {
    loading.value = false;
  }
}

async function handleGoogleRegister() {
  if (!quickRegister.value) return;
  loading.value = true;
  try {
    await googleRegister(newUsername.value, quickRegister.value.idToken);
    router.push('/dashboard');
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

function cancelQuickRegister() {
  quickRegister.value = null;
  newUsername.value = '';
}
</script>
