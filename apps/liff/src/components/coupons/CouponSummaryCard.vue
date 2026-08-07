<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchMyCoupons } from '~/utils/coupons-api';

const usableCount = ref<number | null>(null);

onMounted(async () => {
  try {
    const coupons = await fetchMyCoupons();
    usableCount.value = coupons.filter((coupon) => coupon.state === 'usable').length;
  } catch {
    // 優惠券功能未開啟或查詢失敗時，安靜略過此卡片
    usableCount.value = null;
  }
});
</script>

<template>
  <v-card
    v-if="usableCount !== null"
    class="pa-4 h-100"
    elevation="4"
    rounded="lg"
    :to="{ name: 'myCoupons' }"
  >
    <v-icon icon="mdi-ticket-percent" color="info" size="28" class="mb-2" />
    <div class="text-caption text-medium-emphasis">優惠券</div>
    <div class="text-h5 font-weight-bold text-info">{{ usableCount }}</div>
    <div class="text-caption text-medium-emphasis">可使用</div>
  </v-card>
</template>
