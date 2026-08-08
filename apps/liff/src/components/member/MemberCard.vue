<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { GetLevelResult, PointsWallet } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { useAuthStore } from '~/stores/auth';
import { apiFetch } from '~/utils/api-client';
import { getFreshIdToken } from '~/utils/auth-token';

const store = useAuthStore();
const level = ref<GetLevelResult | null>(null);
const wallet = ref<PointsWallet | null>(null);

const periodProgress = computed(() => {
  if (!level.value) return 0;
  const start = new Date(level.value.startDate).getTime();
  const end = new Date(level.value.endDate).getTime();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
});

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-TW');
}

onMounted(async () => {
  const idToken = await getFreshIdToken();
  const headers = { Authorization: `Bearer ${idToken ?? ''}` };

  try {
    level.value = await apiFetch<GetLevelResult | null>('/api/profile/level', { headers });
  } catch {
    // 等級功能未開啟或查詢失敗時，安靜略過此區塊
    level.value = null;
  }

  try {
    wallet.value = await apiFetch<PointsWallet>('/api/profile/points', { headers });
  } catch {
    // 點數功能未開啟或查詢失敗時，安靜略過此區塊
    wallet.value = null;
  }
});
</script>

<template>
  <AppCard>
    <v-row no-gutters align="start" justify="space-between">
      <v-col cols="auto">
        <div class="text-caption text-medium-emphasis">會員卡</div>
        <div class="text-h6 font-weight-bold">{{ store.user?.displayName ?? '-' }}</div>
      </v-col>
      <v-col v-if="level" cols="auto" class="text-h6 font-weight-bold text-info">
        {{ level.levelName }}
      </v-col>
    </v-row>
    <div v-if="store.user?.memberNo" class="text-body-2 text-medium-emphasis mt-1 mb-3">
      會員編號：{{ store.user.memberNo }}
    </div>

    <template v-if="level">
      <v-progress-linear
        :model-value="periodProgress"
        color="info"
        height="8"
        rounded
        class="mb-1"
      />
      <div class="text-caption text-medium-emphasis">
        {{ level.currentPeriodTotal
        }}<template v-if="level.nextTierThreshold !== null">
          ／ {{ level.nextTierThreshold }}</template
        >
      </div>
      <div class="text-caption text-medium-emphasis text-right">
        將於 {{ formatDate(level.endDate) }} 重置
      </div>
    </template>

    <v-divider v-if="level && wallet" class="my-3" />

    <v-row v-if="wallet" no-gutters align="center" justify="space-between">
      <v-col cols="auto">
        <div class="text-caption text-medium-emphasis">目前點數</div>
        <div class="text-h6 font-weight-bold">{{ wallet.balance }}</div>
      </v-col>
      <v-col cols="auto" class="text-right">
        <div class="text-caption text-medium-emphasis">可折抵金額</div>
        <div class="text-body-1 font-weight-bold text-info">${{ wallet.redeemableAmount }}</div>
      </v-col>
    </v-row>
  </AppCard>
</template>
