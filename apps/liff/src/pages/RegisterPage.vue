<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { isValidUsername } from '@saas-starter-kit/shared';
import { apiFetch, type ApiError } from '~/utils/api-client';
import { completeLineSession } from '~/utils/line-auth-flow';
import { useLineRegistrationStore } from '~/stores/line-registration';

type LineRegisterResult = {
  customToken: string;
};

const router = useRouter();
const pending = useLineRegistrationStore();

const status = ref<'idle' | 'loading' | 'done'>('idle');
const username = ref('');
const errorMessage = ref('');

const usernameValid = computed(() => isValidUsername(username.value));

onMounted(() => {
  if (!pending.idToken) {
    router.replace('/');
  }
});

async function submit() {
  if (!pending.idToken || !usernameValid.value) return;

  status.value = 'loading';
  errorMessage.value = '';
  try {
    const result = await apiFetch<LineRegisterResult>('/api/auth/line-register', {
      method: 'POST',
      body: { username: username.value, idToken: pending.idToken },
    });
    await completeLineSession(result.customToken);
    pending.clear();
    status.value = 'done';
  } catch (e) {
    const statusCode = (e as ApiError).statusCode;
    errorMessage.value =
      statusCode === 409 ? '此帳號名稱已被使用' : e instanceof Error ? e.message : String(e);
    status.value = 'idle';
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="2">
          <template v-if="status === 'done'">
            <div class="text-center">
              <v-icon icon="mdi-check-circle" color="success" size="40" class="mb-2" />
              <div>註冊成功，已完成登入</div>
            </div>
          </template>
          <template v-else>
            <v-card-title class="text-center px-0">建立帳號</v-card-title>
            <p class="text-body-2 text-medium-emphasis mb-4">
              第一次用 LINE 登入，請選擇一個帳號名稱
            </p>
            <v-text-field
              v-model="username"
              label="帳號名稱"
              hint="6–20 碼，全英文或英文加數字"
              persistent-hint
              :error-messages="username && !usernameValid ? ['格式不符'] : []"
              :disabled="status === 'loading'"
              class="mb-4"
              @keyup.enter="submit"
            />
            <v-btn
              block
              color="primary"
              :disabled="!usernameValid"
              :loading="status === 'loading'"
              @click="submit"
            >
              建立帳號
            </v-btn>
            <div v-if="errorMessage" class="text-error text-center mt-3">{{ errorMessage }}</div>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
