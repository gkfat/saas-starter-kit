<script setup lang="ts">
import { onMounted, ref } from 'vue';
import QRCode from 'qrcode';
import type { PointsWallet } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { useAuthStore } from '~/stores/auth';
import { apiFetch } from '~/utils/api-client';
import { getFreshIdToken } from '~/utils/auth-token';

const store = useAuthStore();
const qrDataUrl = ref<string | null>(null);
const wallet = ref<PointsWallet | null>(null);

onMounted(async () => {
  if (store.user?.memberNo) {
    qrDataUrl.value = await QRCode.toDataURL(store.user.memberNo);
  }

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

<template>
  <div class="d-flex flex-column justify-center" style="min-height: calc(100dvh - 180px)">
    <AppCard class="text-center">
      <div class="text-subtitle-1 font-weight-bold mb-1">會員條碼</div>
      <div v-if="store.user?.memberNo" class="text-body-2 text-medium-emphasis">
        {{ store.user.memberNo }}
      </div>
      <div v-if="qrDataUrl" class="d-flex justify-center">
        <img :src="qrDataUrl" alt="會員條碼" width="300" height="300" />
      </div>

      <v-divider v-if="wallet" class="mb-4" />

      <v-row v-if="wallet" no-gutters justify="space-around">
        <v-col cols="auto" class="text-center">
          <div class="text-caption text-medium-emphasis">目前點數</div>
          <div class="text-h6 font-weight-bold">{{ wallet.balance }}</div>
        </v-col>
        <v-col cols="auto" class="text-center">
          <div class="text-caption text-medium-emphasis">可折抵金額</div>
          <div class="text-h6 font-weight-bold text-info">${{ wallet.redeemableAmount }}</div>
        </v-col>
      </v-row>
    </AppCard>

    <div class="close-button-bar d-flex justify-center">
      <v-btn icon="mdi-close" variant="tonal" :to="{ name: 'home' }" />
    </div>
  </div>
</template>

<style scoped>
.close-button-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 24px;
}
</style>
