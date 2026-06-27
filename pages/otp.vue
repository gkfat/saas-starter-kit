<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="4">
          <v-card-title class="text-h5 mb-4">手機 OTP 登入</v-card-title>

          <v-alert v-if="error" type="error" class="mb-4" density="compact">
            {{ error }}
          </v-alert>

          <template v-if="!confirmationResult">
            <v-form @submit.prevent="handleSendOtp">
              <v-text-field
                v-model="phone"
                label="手機號碼（含國碼，例如 +886912345678）"
                type="tel"
                required
                :disabled="loading"
              />
              <div id="recaptcha-container" />
              <v-btn type="submit" color="primary" block :loading="loading" class="mt-2">
                發送 OTP
              </v-btn>
            </v-form>
          </template>

          <template v-else>
            <v-form @submit.prevent="handleVerifyOtp">
              <v-text-field
                v-model="otp"
                label="輸入驗證碼"
                type="text"
                required
                :disabled="loading"
              />
              <v-btn type="submit" color="primary" block :loading="loading"> 驗證並登入 </v-btn>
              <v-btn variant="text" block class="mt-2" :disabled="loading" @click="reset">
                重新發送
              </v-btn>
            </v-form>
          </template>

          <v-btn variant="text" block class="mt-4" @click="navigateTo('/login')"> 返回登入 </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import type { ConfirmationResult } from 'firebase/auth';

definePageMeta({ layout: 'blank' });

const { sendPhoneOtp, verifyPhoneOtp } = useAuth();
const router = useRouter();

const phone = ref('');
const otp = ref('');
const loading = ref(false);
const error = ref('');
const confirmationResult = ref<ConfirmationResult | null>(null);

async function handleSendOtp() {
  error.value = '';
  loading.value = true;
  try {
    confirmationResult.value = await sendPhoneOtp(phone.value, 'recaptcha-container');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '發送失敗';
  } finally {
    loading.value = false;
  }
}

async function handleVerifyOtp() {
  if (!confirmationResult.value) return;
  error.value = '';
  loading.value = true;
  try {
    await verifyPhoneOtp(confirmationResult.value, otp.value, phone.value);
    router.push('/dashboard');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '驗證失敗';
  } finally {
    loading.value = false;
  }
}

function reset() {
  confirmationResult.value = null;
  otp.value = '';
}
</script>
