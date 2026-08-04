<template>
  <v-row class="fill-height" no-gutters justify="center" align="center">
    <v-col cols="12" sm="8" md="4">
      <CardsAppCard class="pa-6" elevation="4">
        <template v-if="quickRegister">
          <v-card-title class="text-h5 mb-4">{{ $t('auth.createAccount') }}</v-card-title>
          <AuthRegisterForm
            :id-token="quickRegister.idToken"
            @success="router.push(ROUTES.dashboard)"
            @cancel="quickRegister = null"
          />
        </template>

        <template v-else>
          <v-card-title class="text-h5 mb-4">{{ $t('auth.login') }}</v-card-title>

          <LoginForm @success="router.push(ROUTES.dashboard)" />

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

          <v-btn
            block
            size="large"
            variant="outlined"
            class="text-none mt-3"
            prepend-icon="mdi-chat"
            @click="handleLineLogin"
          >
            {{ $t('auth.loginWithLine') }}
          </v-btn>

          <div class="text-center text-body-2 mt-6">
            {{ $t('auth.noAccount') }}
            <NuxtLink :to="ROUTES.register">{{ $t('auth.registerLink') }}</NuxtLink>
          </div>
        </template>
      </CardsAppCard>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import LoginForm from './components/LoginForm.vue';
import { ROUTES } from '~/config/app-routes';

definePageMeta({ path: ROUTES.login });

const { loginWithGoogle, loginWithLineRedirect, getLoginErrorMessage } = useAuth();
const { showError } = useToast();
const router = useRouter();
const { t } = useI18n();

const googleLoading = ref(false);

type QuickRegisterState = { displayName: string | null; idToken: string };
const quickRegister = ref<QuickRegisterState | null>(null);

async function handleGoogleLogin() {
  googleLoading.value = true;
  try {
    const result = await loginWithGoogle();
    if (result.status === 'ready') {
      router.push(ROUTES.dashboard);
    } else {
      quickRegister.value = {
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

function handleLineLogin() {
  loginWithLineRedirect();
}
</script>
