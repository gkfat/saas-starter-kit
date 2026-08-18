<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getLineIdToken } from '~/utils/liff-client';
import { apiFetch } from '~/utils/api-client';
import { completeLineSession } from '~/utils/line-auth-flow';
import { useLineRegistrationStore } from '~/stores/line-registration';

type LineLoginResult =
  | { status: 'ready'; customToken: string }
  | { status: 'quick-register'; displayName: string | null; email: string | null };

const router = useRouter();
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
      router.push('/auth/register');
      return;
    }

    await completeLineSession(result.customToken);
    status.value = 'done';
    router.push('/home');
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
    status.value = 'error';
  }
});
</script>

<template>
  <div class="d-flex flex-column align-center justify-center text-center" style="min-height: 80vh">
    <template v-if="status === 'loading'">
      <v-progress-circular indeterminate color="primary" size="48" />
    </template>
    <template v-else-if="status === 'error'">
      <v-icon icon="mdi-close-circle" color="error" size="94" class="mb-4" />
      <div class="text-body-1 px-6">{{ errorMessage }}</div>
    </template>
  </div>
</template>
