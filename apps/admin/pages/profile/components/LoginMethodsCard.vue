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
          <v-col cols="12">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.lineLogin') }}</div>
            <v-row no-gutters align="center" class="ga-2">
              <v-col cols="auto">
                {{ isLineBound ? $t('common.bound') : $t('common.notBound') }}
              </v-col>
              <v-col cols="auto">
                <ButtonsAppButton
                  v-if="isLineBound"
                  kind="secondary"
                  size="small"
                  :loading="lineLoading"
                  :disabled="!canUnbindLine"
                  @click="confirmUnbindLineDialog = true"
                >
                  {{ $t('common.unbind') }}
                </ButtonsAppButton>
                <ButtonsAppButton
                  v-else
                  kind="secondary"
                  size="small"
                  :loading="lineLoading"
                  @click="handleBindLine"
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

    <v-dialog v-model="confirmUnbindLineDialog" max-width="400">
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('profile.unbindLineConfirmTitle') }}</v-card-title>
        <v-card-text>{{ $t('profile.unbindLineConfirmMessage') }}</v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton
            kind="secondary"
            :disabled="lineLoading"
            @click="confirmUnbindLineDialog = false"
          >
            {{ $t('common.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton
            kind="primary"
            color="error"
            :loading="lineLoading"
            @click="handleUnlinkLine"
          >
            {{ $t('common.unbind') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>

    <v-dialog v-model="lineBindCodeDialog" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('profile.lineBindCodeTitle') }}</v-card-title>
        <v-card-text>
          <p class="mb-4">{{ $t('profile.lineBindCodeInstruction') }}</p>
          <v-row v-if="lineBindQrDataUrl" justify="center" class="mb-4">
            <img :src="lineBindQrDataUrl" alt="LINE bind QR code" width="200" height="200" />
          </v-row>
          <div class="text-h4 text-center font-mono mb-2">{{ formattedCode }}</div>
          <p v-if="lineBindCodeSecondsLeft > 0" class="text-center text-medium-emphasis">
            {{ formattedCountdown }}
          </p>
          <p v-else class="text-center text-error">{{ $t('profile.lineBindCodeExpired') }}</p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton kind="secondary" @click="lineBindCodeDialog = false">
            {{ $t('common.cancel') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode';
import { useAuthStore } from '~/stores/auth';

const store = useAuthStore();
const { linkGoogleProvider, unlinkGoogleProvider, generateLineBindCode, unlinkLineProvider } =
  useAuth();
const { showError, showSuccess } = useToast();
const { t } = useI18n();

const googleLoading = ref(false);
const confirmUnbindGoogleDialog = ref(false);

const lineLoading = ref(false);
const confirmUnbindLineDialog = ref(false);
const lineBindCodeDialog = ref(false);
const lineBindCode = ref('');
const lineBindQrDataUrl = ref<string | null>(null);
const lineBindCodeSecondsLeft = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const isGoogleBound = computed(() => store.user?.providers.includes('google') ?? false);
const canUnbindGoogle = computed(() => (store.user?.providers.length ?? 0) > 1);

const isLineBound = computed(() => store.user?.providers.includes('line') ?? false);
const canUnbindLine = computed(() => (store.user?.providers.length ?? 0) > 1);

const formattedCode = computed(() =>
  lineBindCode.value.length === 6
    ? `${lineBindCode.value.slice(0, 3)} ${lineBindCode.value.slice(3)}`
    : lineBindCode.value,
);

const formattedCountdown = computed(() => {
  const minutes = Math.floor(lineBindCodeSecondsLeft.value / 60);
  const seconds = lineBindCodeSecondsLeft.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

function startCountdown(seconds: number) {
  if (countdownTimer) clearInterval(countdownTimer);
  lineBindCodeSecondsLeft.value = seconds;
  countdownTimer = setInterval(() => {
    if (lineBindCodeSecondsLeft.value <= 1) {
      lineBindCodeSecondsLeft.value = 0;
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
      return;
    }
    lineBindCodeSecondsLeft.value -= 1;
  }, 1000);
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});

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

async function handleBindLine() {
  lineLoading.value = true;
  try {
    const result = await generateLineBindCode();
    lineBindCode.value = result.code;
    lineBindQrDataUrl.value = result.liffUrl ? await QRCode.toDataURL(result.liffUrl) : null;
    startCountdown(result.expiresInSeconds);
    lineBindCodeDialog.value = true;
  } catch {
    showError(t('profile.bindLineFailed'));
  } finally {
    lineLoading.value = false;
  }
}

async function handleUnlinkLine() {
  if (!canUnbindLine.value) return;
  lineLoading.value = true;
  try {
    await unlinkLineProvider();
    showSuccess(t('profile.unbindLineSuccess'));
    confirmUnbindLineDialog.value = false;
  } catch (e: unknown) {
    const statusCode = (e as { statusCode?: number }).statusCode;
    showError(
      statusCode === 409 ? t('profile.unbindLineLastProvider') : t('profile.unbindLineFailed'),
    );
  } finally {
    lineLoading.value = false;
  }
}
</script>
