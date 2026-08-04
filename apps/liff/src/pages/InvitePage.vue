<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { getLineIdToken } from '~/utils/liff-client';
import { apiFetch } from '~/utils/api-client';
import { completeLineSession } from '~/utils/line-auth-flow';

type InviteActivateResult = {
  status: 'activated' | 'duplicate';
  customToken: string;
};

const route = useRoute();
const status = ref<'loading' | 'error' | 'duplicate' | 'done'>('loading');
const errorMessage = ref('');

onMounted(async () => {
  const token = route.query.token;
  if (typeof token !== 'string' || !token) {
    status.value = 'error';
    errorMessage.value = '邀請連結無效';
    return;
  }

  try {
    const idToken = await getLineIdToken();
    const result = await apiFetch<InviteActivateResult>('/api/auth/line-invite-activate', {
      method: 'POST',
      body: { token, idToken },
    });
    await completeLineSession(result.customToken);
    status.value = result.status === 'duplicate' ? 'duplicate' : 'done';
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
    status.value = 'error';
  }
});
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6 text-center" elevation="2">
          <template v-if="status === 'loading'">
            <v-progress-circular indeterminate color="primary" class="mb-4" />
            <div>處理中...</div>
          </template>
          <template v-else-if="status === 'error'">
            <v-icon icon="mdi-alert-circle" color="error" size="40" class="mb-2" />
            <div class="text-error">{{ errorMessage }}</div>
          </template>
          <template v-else-if="status === 'duplicate'">
            <v-icon icon="mdi-information" color="warning" size="40" class="mb-2" />
            <div>您已註冊過帳號，將直接登入</div>
          </template>
          <template v-else-if="status === 'done'">
            <v-icon icon="mdi-check-circle" color="success" size="40" class="mb-2" />
            <div>帳號啟用成功，已完成登入</div>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
