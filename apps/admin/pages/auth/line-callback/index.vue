<template>
  <v-row class="fill-height" no-gutters justify="center" align="center">
    <v-col cols="12" sm="8" md="4">
      <CardsAppCard class="pa-6" elevation="4">
        <template v-if="quickRegister">
          <v-card-title class="text-h5 mb-4">{{ $t('auth.createAccount') }}</v-card-title>
          <AuthRegisterForm
            :id-token="quickRegister.idToken"
            provider="line"
            @success="router.push('/dashboard')"
            @cancel="router.push('/login')"
          />
        </template>
        <template v-else>
          <v-row justify="center" class="py-8">
            <v-progress-circular indeterminate color="primary" />
          </v-row>
        </template>
      </CardsAppCard>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
definePageMeta({ path: '/auth/line-callback' });

const route = useRoute();
const router = useRouter();
const { completeLineLogin } = useAuth();
const { showError } = useToast();
const { t } = useI18n();

type QuickRegisterState = { displayName: string | null; idToken: string };
const quickRegister = ref<QuickRegisterState | null>(null);

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : '';
  const state = typeof route.query.state === 'string' ? route.query.state : '';
  const expectedState = sessionStorage.getItem('line_oauth_state');
  sessionStorage.removeItem('line_oauth_state');

  if (route.query.error || !code || !state || state !== expectedState) {
    showError(t('auth.error.lineStateMismatch'));
    router.push('/login');
    return;
  }

  try {
    const redirectUri = `${window.location.origin}/auth/line-callback`;
    const result = await completeLineLogin(code, redirectUri);

    if (result.status === 'ready') {
      router.push('/dashboard');
      return;
    }

    quickRegister.value = { displayName: result.displayName, idToken: result.idToken };
  } catch {
    showError(t('auth.error.lineLoginFailed'));
    router.push('/login');
  }
});
</script>
