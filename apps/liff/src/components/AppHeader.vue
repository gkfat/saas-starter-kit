<template>
  <v-row no-gutters justify="space-between" align="center">
    <v-col cols="auto" class="d-flex align-center ga-2">
      <img src="/logo.svg" alt="" width="24" height="24" />
      <span class="text-subtitle-1 font-weight-bold">SaaS Starter Kit</span>
    </v-col>
    <v-col cols="auto" class="d-flex align-center">
      <v-btn v-if="wallet" variant="text" size="sm" :to="{ name: 'points' }" class="text-none">
        <v-avatar color="primary" size="20" class="mr-1">
          <span class="text-caption font-weight-bold text-white">P</span>
        </v-avatar>
        {{ wallet.balance }}
      </v-btn>
      <v-btn
        icon="mdi-cog-outline"
        variant="text"
        color="medium-emphasis"
        @click="emit('toggle-menu')"
      />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { PointsWallet } from '@saas-starter-kit/shared';
import { apiFetch } from '~/utils/api-client';
import { getFreshIdToken } from '~/utils/auth-token';

const emit = defineEmits<{ 'toggle-menu': [] }>();

const wallet = ref<PointsWallet | null>(null);

onMounted(async () => {
  try {
    const idToken = await getFreshIdToken();
    wallet.value = await apiFetch<PointsWallet>('/api/profile/points', {
      headers: { Authorization: `Bearer ${idToken ?? ''}` },
    });
  } catch {
    // 點數功能未開啟或查詢失敗時，安靜略過此區塊
    wallet.value = null;
  }
});
</script>
