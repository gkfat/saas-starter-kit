<script setup lang="ts">
import { computed } from 'vue';
import AppCard from '~/components/common/AppCard.vue';

const shortcuts = computed(() => [
  { icon: 'mdi-card-account-details-outline', label: '會員卡', to: { name: 'memberCard' } },
  ...(import.meta.env.VITE_FEATURE_COUPON_ENABLED
    ? [{ icon: 'mdi-ticket-percent-outline', label: '優惠券', to: { name: 'myCoupons' } }]
    : []),
  ...(import.meta.env.VITE_FEATURE_POINTS_ENABLED
    ? [{ icon: 'mdi-cash-multiple', label: '點數', to: { name: 'points' } }]
    : []),
]);
</script>

<template>
  <div class="shortcuts-grid">
    <AppCard
      v-for="shortcut in shortcuts"
      :key="shortcut.label"
      :to="shortcut.to"
      padding="2"
      class="d-flex flex-column align-center justify-center text-center"
    >
      <v-icon :icon="shortcut.icon" color="primary" size="small" class="mb-1" />
      <div class="text-caption text-medium-emphasis">{{ shortcut.label }}</div>
    </AppCard>
  </div>
</template>

<style scoped>
.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(6, 12px);
  row-gap: 6px;
  justify-content: space-between;
}

.shortcuts-grid > :deep(.v-card) {
  min-width: 60px;
  min-height: 60px;
}
</style>
