<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { GetLevelResult } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { useAuthStore } from '~/stores/auth';
import { apiFetch } from '~/utils/api-client';
import { getFreshIdToken } from '~/utils/auth-token';

const store = useAuthStore();
const level = ref<GetLevelResult | null>(null);

const periodProgress = computed(() => {
  if (!level.value || !level.value.nextTierThreshold) return 0;
  return Math.min(
    100,
    Math.max(0, (level.value.currentPeriodTotal / level.value.nextTierThreshold) * 100),
  );
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
});
</script>

<template>
  <AppCard>
    <v-row no-gutters align="start" justify="space-between" class="mb-3">
      <v-col cols="auto">
        <p class="text-h6 font-weight-bold">{{ store.user?.displayName ?? '-' }}</p>
      </v-col>
      <v-col v-if="level" cols="auto">
        <v-chip
          prepend-icon="mdi-star"
          color="warning"
          variant="flat"
          size="small"
          class="font-weight-bold text-caption"
          >{{ level.levelName }}</v-chip
        >
      </v-col>
    </v-row>

    <template v-if="level">
      <v-progress-linear
        :model-value="periodProgress"
        color="info"
        bg-opacity="0.12"
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
        將於 {{ formatDate(level.endDate) }} 到期
      </div>
    </template>
  </AppCard>
</template>
