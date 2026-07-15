<template>
  <div>
    <v-card elevation="2" rounded="lg" class="border h-100">
      <v-card-title class="d-flex align-center justify-end py-3">
        <span class="mr-auto">{{ $t('profile.profileCardTitle') }}</span>
        <v-btn size="small" variant="text" class="border" @click="startEditDisplayName">
          {{ $t('profile.editDisplayName') }}
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('auth.username') }}</div>
            <div>{{ store.user?.username ?? '—' }}</div>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.email') }}</div>
            <div v-if="store.user?.email">{{ store.user.email }}</div>
            <v-row v-else no-gutters align="center" class="ga-2">
              <v-col cols="auto" class="text-medium-emphasis">{{ $t('common.notBound') }}</v-col>
              <v-col cols="auto">
                <v-btn size="small" variant="text" class="border" disabled>
                  {{ $t('common.bind') }}
                </v-btn>
              </v-col>
            </v-row>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.displayName') }}</div>
            <div>{{ store.user?.displayName ?? '—' }}</div>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.role') }}</div>
            <div>{{ $t(`role.${store.user?.role}`) }}</div>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.phone') }}</div>
            <v-row v-if="store.user?.phone" no-gutters align="center" class="ga-2">
              <v-col cols="auto">{{ store.user.phone }}</v-col>
              <v-col cols="auto">
                <v-icon size="small" color="success">mdi-check-circle</v-icon>
              </v-col>
            </v-row>
            <v-row v-else no-gutters align="center" class="ga-2">
              <v-col cols="auto" class="text-medium-emphasis">{{
                $t('profile.phoneNotVerified')
              }}</v-col>
              <v-col cols="auto">
                <v-btn size="small" variant="text" class="border" @click="openVerifyPhoneDialog">
                  {{ $t('common.verify') }}
                </v-btn>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-dialog v-model="editingDisplayName" max-width="400" persistent>
      <v-card>
        <v-card-title class="pa-4">{{ $t('profile.editDisplayName') }}</v-card-title>
        <v-card-text>
          <div class="text-caption text-medium-emphasis mb-1">{{ $t('profile.displayName') }}</div>
          <v-text-field
            v-model="displayNameInput"
            hide-details="auto"
            :disabled="displayNameLoading"
            :error-messages="displayNameError"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" :disabled="displayNameLoading" @click="cancelEditDisplayName">
            {{ $t('profile.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :loading="displayNameLoading"
            :disabled="!isDisplayNameValid"
            @click="handleSaveDisplayName"
          >
            {{ $t('profile.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="verifyPhoneDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="pa-4">{{ $t('profile.verifyPhone') }}</v-card-title>
        <v-card-text>
          <template v-if="!confirmationResult">
            <div class="text-caption text-medium-emphasis mb-1">
              {{ $t('profile.phonePlaceholder') }}
            </div>
            <v-text-field
              v-model="phoneLocal"
              prefix="+886"
              type="tel"
              hide-details="auto"
              :disabled="loading"
              :error-messages="phoneError"
            />
            <div id="recaptcha-container" />
          </template>
          <template v-else>
            <div class="text-caption text-medium-emphasis mb-1">{{ $t('profile.enterOtp') }}</div>
            <v-otp-input v-model="otp" length="6" :disabled="loading" />
          </template>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <template v-if="!confirmationResult">
            <v-btn variant="text" :disabled="loading" @click="verifyPhoneDialog = false">
              {{ $t('profile.cancel') }}
            </v-btn>
            <v-btn
              color="primary"
              :loading="loading"
              :disabled="!isPhoneValid"
              @click="handleSendOtp"
            >
              {{ $t('auth.sendOtp') }}
            </v-btn>
          </template>
          <template v-else>
            <v-btn variant="text" :disabled="loading" @click="resetOtp">
              {{ $t('profile.resendOtp') }}
            </v-btn>
            <v-btn color="primary" :loading="loading" @click="handleConfirmOtp">
              {{ $t('profile.confirmOtp') }}
            </v-btn>
          </template>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { ConfirmationResult } from 'firebase/auth';
import { useAuthStore } from '~/stores/auth';

const store = useAuthStore();
const { sendPhoneLinkOtp, confirmPhoneLinkOtp } = useAuth();
const { showError, showSuccess } = useToast();
const { t } = useI18n();

const phoneLocal = ref('');
const otp = ref('');
const loading = ref(false);
const confirmationResult = ref<ConfirmationResult | null>(null);

const fullPhone = computed(() => `+886${phoneLocal.value.replace(/^0+/, '')}`);

const isPhoneValid = computed(() => /^0?9\d{8}$/.test(phoneLocal.value));

const phoneError = computed(() => {
  if (!phoneLocal.value || isPhoneValid.value) return '';
  return t('profile.phoneInvalid');
});

const editingDisplayName = ref(false);
const displayNameInput = ref('');
const displayNameLoading = ref(false);

const verifyPhoneDialog = ref(false);

const isDisplayNameValid = computed(() => {
  const trimmed = displayNameInput.value.trim();
  return trimmed.length > 0 && trimmed.length <= 20;
});

const displayNameError = computed(() => {
  const trimmed = displayNameInput.value.trim();
  if (trimmed.length === 0) return t('profile.displayNameRequired');
  if (trimmed.length > 20) return t('profile.displayNameTooLong');
  return '';
});

function startEditDisplayName() {
  displayNameInput.value = store.user?.displayName ?? '';
  editingDisplayName.value = true;
}

function cancelEditDisplayName() {
  editingDisplayName.value = false;
}

async function handleSaveDisplayName() {
  if (!isDisplayNameValid.value || !store.user) return;
  const trimmed = displayNameInput.value.trim();
  displayNameLoading.value = true;
  try {
    await $fetch('/api/profile/display-name', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${store.idToken ?? ''}` },
      body: { displayName: trimmed },
    });
    store.user.displayName = trimmed;
    showSuccess(t('profile.displayNameUpdateSuccess'));
    editingDisplayName.value = false;
  } catch {
    showError(t('profile.displayNameUpdateFailed'));
  } finally {
    displayNameLoading.value = false;
  }
}

function openVerifyPhoneDialog() {
  phoneLocal.value = '';
  otp.value = '';
  confirmationResult.value = null;
  verifyPhoneDialog.value = true;
}

async function handleSendOtp() {
  if (!isPhoneValid.value) return;
  loading.value = true;
  try {
    confirmationResult.value = await sendPhoneLinkOtp(fullPhone.value, 'recaptcha-container');
  } catch (e: unknown) {
    showError(e instanceof Error ? e.message : t('profile.otpSendFailed'));
  } finally {
    loading.value = false;
  }
}

async function handleConfirmOtp() {
  if (!confirmationResult.value || !store.user) return;
  loading.value = true;
  try {
    await confirmPhoneLinkOtp(confirmationResult.value, otp.value);
    store.user.phone = fullPhone.value;
    showSuccess(t('profile.otpSuccess'));
    confirmationResult.value = null;
    verifyPhoneDialog.value = false;
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
