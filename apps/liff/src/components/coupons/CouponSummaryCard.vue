<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppCard from '~/components/common/AppCard.vue';
import { fetchMyCoupons } from '~/utils/coupons-api';

const emit = defineEmits<{ visible: [value: boolean] }>();

const usableCount = ref<number | null>(null);

onMounted(async () => {
  try {
    const coupons = await fetchMyCoupons();
    usableCount.value = coupons.filter((coupon) => coupon.state === 'usable').length;
    emit('visible', true);
  } catch {
    // 優惠券功能未開啟或查詢失敗時，安靜略過此卡片
    usableCount.value = null;
    emit('visible', false);
  }
});
</script>

<template>
  <AppCard v-if="usableCount !== null" class="h-100" :to="{ name: 'myCoupons' }">
    <v-icon icon="mdi-ticket-percent" color="info" size="28" class="mb-2" />
    <div class="text-caption text-medium-emphasis">優惠券</div>
    <div class="text-h5 font-weight-bold text-info">{{ usableCount }}</div>
    <div class="text-caption text-medium-emphasis">可使用</div>
  </AppCard>
</template>
