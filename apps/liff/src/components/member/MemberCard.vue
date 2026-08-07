<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { GetLevelResult } from '@saas-starter-kit/shared';
import { useAuthStore } from '~/stores/auth';
import { apiFetch } from '~/utils/api-client';
import { getFreshIdToken } from '~/utils/auth-token';

const store = useAuthStore();
const level = ref<GetLevelResult | null>(null);

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
  try {
    const idToken = await getFreshIdToken();
    level.value = await apiFetch<GetLevelResult | null>('/api/profile/level', {
      headers: { Authorization: `Bearer ${idToken ?? ''}` },
    });
  } catch {
    // 等級功能未開啟或查詢失敗時，安靜略過此區塊
    level.value = null;
  }
});
</script>

<template>
  <v-card class="pa-4" elevation="4" rounded="lg">
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
  </v-card>
</template>
