<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import AppCard from '~/components/common/AppCard.vue';
import { getLineIdToken } from '~/utils/liff-client';
import { apiFetch } from '~/utils/api-client';

const route = useRoute();
const code = ref(typeof route.query.code === 'string' ? route.query.code : '');
const status = ref<'idle' | 'loading' | 'error' | 'done'>('idle');
const errorMessage = ref('');

async function submit() {
  status.value = 'loading';
  errorMessage.value = '';
  try {
    const idToken = await getLineIdToken();
    await apiFetch('/api/auth/line-bind-code-activate', {
      method: 'POST',
      body: { code: code.value, idToken },
    });
    status.value = 'done';
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
    status.value = 'error';
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="4">
        <AppCard padding="6">
          <template v-if="status === 'idle' || status === 'error'">
            <v-card-title class="text-center px-0">綁定 LINE</v-card-title>
            <v-text-field
              v-model="code"
              label="驗證碼"
              maxlength="6"
              inputmode="numeric"
              placeholder="000000"
              hide-details="auto"
              class="mb-4"
            />
            <v-btn block color="primary" :disabled="code.length !== 6" @click="submit">
              確認綁定
            </v-btn>
            <div v-if="status === 'error'" class="text-error text-center mt-3">
              {{ errorMessage }}
            </div>
          </template>
          <template v-else-if="status === 'loading'">
            <div class="text-center">
              <v-progress-circular indeterminate color="primary" class="mb-4" />
              <div>綁定中...</div>
            </div>
          </template>
          <template v-else-if="status === 'done'">
            <div class="text-center">
              <v-icon icon="mdi-check-circle" color="success" size="40" class="mb-2" />
              <div>綁定成功，請回到原本頁面重新登入</div>
            </div>
          </template>
        </AppCard>
      </v-col>
    </v-row>
  </v-container>
</template>
