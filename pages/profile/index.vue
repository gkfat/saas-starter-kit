<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-card class="pa-6" elevation="2">
        <v-card-title class="text-h5 mb-4">Profile</v-card-title>

        <v-list lines="two" class="mb-4">
          <v-list-item title="Email" :subtitle="store.user?.email ?? '—'" />
          <v-list-item title="Display Name" :subtitle="store.user?.displayName ?? '—'" />
          <v-list-item title="Role">
            <template #subtitle>
              <v-chip size="small" color="primary" variant="tonal">
                {{ store.user?.role }}
              </v-chip>
            </template>
          </v-list-item>
          <v-list-item title="手機號碼">
            <template #subtitle>
              <span v-if="store.user?.phone" class="d-flex align-center gap-2">
                {{ store.user.phone }}
                <v-icon size="small" color="success">mdi-check-circle</v-icon>
              </span>
              <span v-else class="text-medium-emphasis">未驗證</span>
            </template>
          </v-list-item>
        </v-list>

        <v-divider class="mb-4" />

        <div v-if="!store.user?.phone">
          <div class="text-subtitle-2 mb-3">驗證手機號碼</div>

          <v-alert v-if="error" type="error" density="compact" class="mb-3">
            {{ error }}
          </v-alert>
          <v-alert v-if="success" type="success" density="compact" class="mb-3">
            手機號碼驗證成功
          </v-alert>

          <template v-if="!confirmationResult">
            <v-text-field
              v-model="phone"
              label="手機號碼（含國碼，例如 +886912345678）"
              type="tel"
              density="compact"
              :disabled="loading"
              class="mb-2"
            />
            <div id="recaptcha-container" />
            <v-btn color="primary" :loading="loading" @click="handleSendOtp"> 發送驗證碼 </v-btn>
          </template>

          <template v-else>
            <v-text-field
              v-model="otp"
              label="輸入驗證碼"
              type="text"
              density="compact"
              :disabled="loading"
              class="mb-2"
            />
            <v-btn color="primary" :loading="loading" class="mr-2" @click="handleConfirmOtp">
              確認驗證
            </v-btn>
            <v-btn variant="text" :disabled="loading" @click="resetOtp"> 重新發送 </v-btn>
          </template>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import type { ConfirmationResult } from 'firebase/auth';
import { useAuthStore } from '~/stores/auth';

const store = useAuthStore();
const { sendPhoneLinkOtp, confirmPhoneLinkOtp } = useAuth();

const phone = ref('');
const otp = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);
const confirmationResult = ref<ConfirmationResult | null>(null);

async function handleSendOtp() {
  error.value = '';
  loading.value = true;
  try {
    confirmationResult.value = await sendPhoneLinkOtp(phone.value, 'recaptcha-container');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '發送失敗';
  } finally {
    loading.value = false;
  }
}

async function handleConfirmOtp() {
  if (!confirmationResult.value) return;
  error.value = '';
  loading.value = true;
  try {
    await confirmPhoneLinkOtp(confirmationResult.value, otp.value);
    success.value = true;
    confirmationResult.value = null;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '驗證失敗';
  } finally {
    loading.value = false;
  }
}

function resetOtp() {
  confirmationResult.value = null;
  otp.value = '';
}
</script>
