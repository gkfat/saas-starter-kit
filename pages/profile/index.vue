<template>
  <div>
    <LayoutBreadcrumb />
    <LayoutPageHeader :title="$t('profile.title')" />
    <v-row>
      <v-col cols="12" md="6">
        <v-card elevation="2">
          <v-card-text>
            <v-list lines="two" class="mb-4">
              <v-list-item :title="$t('profile.email')" :subtitle="store.user?.email ?? '—'" />
              <v-list-item
                :title="$t('profile.displayName')"
                :subtitle="store.user?.displayName ?? '—'"
              />
              <v-list-item :title="$t('profile.role')">
                <template #subtitle>
                  <v-chip size="small" color="primary" variant="tonal">
                    {{ store.user?.role }}
                  </v-chip>
                </template>
              </v-list-item>
              <v-list-item :title="$t('profile.phone')">
                <template #subtitle>
                  <span v-if="store.user?.phone" class="d-flex align-center gap-2">
                    {{ store.user.phone }}
                    <v-icon size="small" color="success">mdi-check-circle</v-icon>
                  </span>
                  <span v-else class="text-medium-emphasis">{{
                    $t('profile.phoneNotVerified')
                  }}</span>
                </template>
              </v-list-item>
            </v-list>

            <v-divider class="mb-4" />

            <div v-if="!store.user?.phone">
              <div class="text-subtitle-2 mb-3">{{ $t('profile.verifyPhone') }}</div>

              <template v-if="!confirmationResult">
                <v-text-field
                  v-model="phone"
                  :label="$t('profile.phonePlaceholder')"
                  type="tel"
                  density="compact"
                  :disabled="loading"
                  class="mb-2"
                />
                <div id="recaptcha-container" />
                <v-btn color="primary" :loading="loading" @click="handleSendOtp">
                  {{ $t('auth.sendOtp') }}
                </v-btn>
              </template>

              <template v-else>
                <v-text-field
                  v-model="otp"
                  :label="$t('profile.enterOtp')"
                  type="text"
                  density="compact"
                  :disabled="loading"
                  class="mb-2"
                />
                <v-btn color="primary" :loading="loading" class="mr-2" @click="handleConfirmOtp">
                  {{ $t('profile.confirmOtp') }}
                </v-btn>
                <v-btn variant="text" :disabled="loading" @click="resetOtp">
                  {{ $t('profile.resendOtp') }}
                </v-btn>
              </template>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import type { ConfirmationResult } from 'firebase/auth';
import { useAuthStore } from '~/stores/auth';

const store = useAuthStore();
const { sendPhoneLinkOtp, confirmPhoneLinkOtp } = useAuth();
const { showError, showSuccess } = useToast();
const { t } = useI18n();

const phone = ref('');
const otp = ref('');
const loading = ref(false);
const confirmationResult = ref<ConfirmationResult | null>(null);

async function handleSendOtp() {
  loading.value = true;
  try {
    confirmationResult.value = await sendPhoneLinkOtp(phone.value, 'recaptcha-container');
  } catch (e: unknown) {
    showError(e instanceof Error ? e.message : t('profile.otpSendFailed'));
  } finally {
    loading.value = false;
  }
}

async function handleConfirmOtp() {
  if (!confirmationResult.value) return;
  loading.value = true;
  try {
    await confirmPhoneLinkOtp(confirmationResult.value, otp.value);
    showSuccess(t('profile.otpSuccess'));
    confirmationResult.value = null;
  } catch (e: unknown) {
    showError(e instanceof Error ? e.message : t('profile.otpFailed'));
  } finally {
    loading.value = false;
  }
}

function resetOtp() {
  confirmationResult.value = null;
  otp.value = '';
}
</script>
