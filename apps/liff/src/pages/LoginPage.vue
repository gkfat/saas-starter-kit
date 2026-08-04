<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getLineIdToken } from '~/utils/liff-client';
import { apiFetch } from '~/utils/api-client';
import { completeLineSession } from '~/utils/line-auth-flow';
import { useAuthStore } from '~/stores/auth';
import { useLineRegistrationStore } from '~/stores/line-registration';

type LineLoginResult =
  | { status: 'ready'; customToken: string }
  | { status: 'quick-register'; displayName: string | null; email: string | null };

const router = useRouter();
const store = useAuthStore();
const status = ref<'loading' | 'error' | 'done'>('loading');
const errorMessage = ref('');

onMounted(async () => {
  try {
    const idToken = await getLineIdToken();
    const result = await apiFetch<LineLoginResult>('/api/auth/line-login', {
      method: 'POST',
      body: { idToken },
    });

    if (result.status === 'quick-register') {
      useLineRegistrationStore().setPending({
        idToken,
        displayName: result.displayName,
        email: result.email,
      });
      router.push('/register');
      return;
    }

    await completeLineSession(result.customToken);
    status.value = 'done';
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
            <div>正在進入...</div>
          </template>
          <template v-else-if="status === 'error'">
            <v-icon icon="mdi-alert-circle" color="error" size="40" class="mb-2" />
            <div class="text-error">{{ errorMessage }}</div>
          </template>
          <template v-else-if="status === 'done'">
            <v-icon icon="mdi-check-circle" color="success" size="40" class="mb-2" />
            <div>登入成功，歡迎 {{ store.user?.displayName ?? store.user?.username }}</div>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
