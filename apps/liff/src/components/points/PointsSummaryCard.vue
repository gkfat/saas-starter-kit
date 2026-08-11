<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { PointsWallet } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { apiFetch } from '~/utils/api-client';
import { getFreshIdToken } from '~/utils/auth-token';

const wallet = ref<PointsWallet | null>(null);

onMounted(async () => {
  try {
    const idToken = await getFreshIdToken();
    wallet.value = await apiFetch<PointsWallet>('/api/profile/points', {
      headers: { Authorization: `Bearer ${idToken ?? ''}` },
    });
  } catch {
    // 點數功能未開啟或查詢失敗時，安靜略過此卡片
    wallet.value = null;
  }
});
</script>

<template>
  <AppCard v-if="wallet" class="h-100" :to="{ name: 'points' }">
    <v-icon icon="mdi-cash-multiple" color="warning" size="28" class="mb-2" />
    <div class="text-caption text-medium-emphasis">點數</div>
    <div class="text-h5 font-weight-bold text-warning">{{ wallet.balance }}</div>
    <div class="text-caption text-medium-emphasis">目前可用</div>
  </AppCard>
</template>
