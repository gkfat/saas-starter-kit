<template>
  <div class="h-100">
    <CardsAppCard class="h-100" :min-width="280">
      <v-card-title class="py-3">
        {{ $t('profile.loginMethods') }}
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.googleLogin') }}</div>
            <v-row no-gutters align="center" class="ga-2">
              <v-col cols="auto">
                {{ isGoogleBound ? $t('common.bound') : $t('common.notBound') }}
              </v-col>
              <v-col cols="auto">
                <ButtonsAppButton
                  v-if="isGoogleBound"
                  kind="secondary"
                  size="small"
                  :loading="googleLoading"
                  :disabled="!canUnbindGoogle"
                  @click="confirmUnbindGoogleDialog = true"
                >
                  {{ $t('common.unbind') }}
                </ButtonsAppButton>
                <ButtonsAppButton
                  v-else
                  kind="secondary"
                  size="small"
                  :loading="googleLoading"
                  @click="handleLinkGoogle"
                >
                  {{ $t('common.bind') }}
                </ButtonsAppButton>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-card-text>
    </CardsAppCard>

    <v-dialog v-model="confirmUnbindGoogleDialog" max-width="400">
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('profile.unbindGoogleConfirmTitle') }}</v-card-title>
        <v-card-text>{{ $t('profile.unbindGoogleConfirmMessage') }}</v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton
            kind="secondary"
            :disabled="googleLoading"
            @click="confirmUnbindGoogleDialog = false"
          >
            {{ $t('common.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton
            kind="primary"
            color="error"
            :loading="googleLoading"
            @click="handleUnlinkGoogle"
          >
            {{ $t('common.unbind') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const store = useAuthStore();
const { linkGoogleProvider, unlinkGoogleProvider } = useAuth();
const { showError, showSuccess } = useToast();
const { t } = useI18n();

const googleLoading = ref(false);
const confirmUnbindGoogleDialog = ref(false);

const isGoogleBound = computed(() => store.user?.providers.includes('google') ?? false);
const canUnbindGoogle = computed(() => (store.user?.providers.length ?? 0) > 1);

function getGoogleLinkErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  const map: Record<string, string> = {
    'auth/credential-already-in-use': t('auth.error.googleAlreadyLinked'),
    'auth/popup-closed-by-user': t('auth.error.popupClosed'),
    'auth/cancelled-popup-request': t('auth.error.popupClosed'),
    'auth/popup-blocked': t('auth.error.popupBlocked'),
  };
  return map[code] ?? t('profile.bindGoogleFailed');
}

async function handleLinkGoogle() {
  googleLoading.value = true;
  try {
    await linkGoogleProvider();
    showSuccess(t('profile.bindGoogleSuccess'));
  } catch (e: unknown) {
    showError(getGoogleLinkErrorMessage(e));
  } finally {
    googleLoading.value = false;
  }
}

async function handleUnlinkGoogle() {
  if (!canUnbindGoogle.value) return;
  googleLoading.value = true;
  try {
    await unlinkGoogleProvider();
    showSuccess(t('profile.unbindGoogleSuccess'));
    confirmUnbindGoogleDialog.value = false;
  } catch (e: unknown) {
    const statusCode = (e as { statusCode?: number }).statusCode;
    showError(
      statusCode === 409 ? t('profile.unbindGoogleLastProvider') : t('profile.unbindGoogleFailed'),
    );
  } finally {
    googleLoading.value = false;
  }
}
</script>
