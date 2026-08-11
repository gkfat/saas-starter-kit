<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import QRCode from 'qrcode';
import type { GetLevelResult, PointsWallet } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { useAuthStore } from '~/stores/auth';
import { apiFetch } from '~/utils/api-client';
import { getFreshIdToken } from '~/utils/auth-token';

const store = useAuthStore();
const qrDataUrl = ref<string | null>(null);
const wallet = ref<PointsWallet | null>(null);
const level = ref<GetLevelResult | null>(null);
const loading = ref(true);

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

async function loadMemberCard(): Promise<void> {
  loading.value = true;
  try {
    if (store.user?.memberNo) {
      qrDataUrl.value = await QRCode.toDataURL(store.user.memberNo);
    }

    const idToken = await getFreshIdToken();
    const headers = { Authorization: `Bearer ${idToken ?? ''}` };

    try {
      wallet.value = await apiFetch<PointsWallet>('/api/profile/points', { headers });
    } catch {
      // 點數功能未開啟或查詢失敗時，安靜略過此區塊
      wallet.value = null;
    }

    try {
      level.value = await apiFetch<GetLevelResult | null>('/api/profile/level', { headers });
    } catch {
      // 等級功能未開啟或查詢失敗時，安靜略過此區塊
      level.value = null;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadMemberCard);
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-h6 font-weight-bold">我的會員卡</div>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        density="comfortable"
        :loading="loading"
        @click="loadMemberCard"
      />
    </div>

    <AppCard class="text-center">
      <div class="text-h6 font-weight-bold">{{ store.user?.displayName ?? '-' }}</div>
      <div v-if="store.user?.memberNo" class="text-body-2 text-medium-emphasis mb-3">
        {{ store.user.memberNo }}
      </div>

      <v-row v-if="wallet" no-gutters justify="space-around">
        <v-col cols="auto" class="text-center">
          <div class="text-caption text-medium-emphasis">目前點數</div>
          <div class="text-h6 font-weight-bold">{{ wallet.balance }}</div>
        </v-col>
        <v-col cols="auto" class="text-center">
          <div class="text-caption text-medium-emphasis">可折抵金額</div>
          <div class="text-h6 font-weight-bold text-warning">${{ wallet.redeemableAmount }}</div>
        </v-col>
      </v-row>

      <v-divider v-if="wallet && qrDataUrl" class="mt-3" />

      <!-- 會員條碼區塊 -->
      <div v-if="qrDataUrl" class="d-flex flex-column align-center">
        <img :src="qrDataUrl" alt="會員條碼" width="200" height="200" />
      </div>

      <v-divider v-if="qrDataUrl && level" class="mb-3" />

      <!-- 等級區塊 -->
      <template v-if="level">
        <v-chip
          prepend-icon="mdi-star"
          color="warning"
          variant="flat"
          size="small"
          class="font-weight-bold text-caption"
          >{{ level.levelName }}</v-chip
        >
        <v-progress-linear
          :model-value="periodProgress"
          color="info"
          bg-opacity="0.12"
          height="8"
          rounded
          class="my-3"
        />
        <v-row no-gutters justify="space-between" align="center">
          <v-col cols="auto">
            <div class="text-caption text-medium-emphasis">
              {{ level.currentPeriodTotal
              }}<template v-if="level.nextTierThreshold !== null">
                ／ {{ level.nextTierThreshold }}</template
              >
            </div>
          </v-col>
          <v-col cols="auto">
            <div class="text-caption text-medium-emphasis">
              將於 {{ formatDate(level.endDate) }} 到期
            </div>
          </v-col>
        </v-row>
      </template>
    </AppCard>
  </div>
</template>
