<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <CardsAppCard class="pa-6" elevation="4">
          <template v-if="quickRegister">
            <v-card-title class="text-h5 mb-2">{{ $t('auth.chooseUsername') }}</v-card-title>
            <v-card-subtitle class="mb-4">{{ quickRegister.googleEmail }}</v-card-subtitle>
            <GoogleRegisterForm
              :id-token="quickRegister.idToken"
              @success="router.push('/dashboard')"
              @cancel="quickRegister = null"
            />
          </template>

          <template v-else>
            <v-card-title class="text-h5 mb-4">{{ $t('auth.login') }}</v-card-title>

            <LoginForm @success="router.push('/dashboard')" />

            <v-divider class="my-6">{{ $t('common.or') }}</v-divider>

            <v-btn
              block
              size="large"
              variant="outlined"
              :loading="googleLoading"
              class="text-none"
              prepend-icon="mdi-google"
              @click="handleGoogleLogin"
            >
              {{ $t('auth.loginWithGoogle') }}
            </v-btn>

            <div class="text-center text-body-2 mt-6">
              {{ $t('auth.noAccount') }}
              <NuxtLink to="/register">{{ $t('auth.registerLink') }}</NuxtLink>
            </div>
          </template>
        </CardsAppCard>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import GoogleRegisterForm from './components/GoogleRegisterForm.vue';
import LoginForm from './components/LoginForm.vue';

definePageMeta({ layout: 'blank', path: '/login' });

const { loginWithGoogle, getLoginErrorMessage } = useAuth();
const { showError } = useToast();
const router = useRouter();
const { t } = useI18n();

const googleLoading = ref(false);

type QuickRegisterState = { googleEmail: string; displayName: string | null; idToken: string };
const quickRegister = ref<QuickRegisterState | null>(null);

async function handleGoogleLogin() {
  googleLoading.value = true;
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
    googleLoading.value = false;
  }
}
</script>
