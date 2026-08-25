<script setup lang="ts">
import { AnalyticsEvent } from '@saas-starter-kit/shared';
import { useRouter } from 'vue-router';
import AppCard from '~/components/common/AppCard.vue';
import { trackEvent } from '~/utils/analytics';

const router = useRouter();

const bookingEnabled = Boolean(import.meta.env.VITE_FEATURE_BOOKING_ENABLED);

function startBooking() {
  trackEvent(AnalyticsEvent.BookingCtaClick);
  router.push({ name: 'bookingServices' });
}
</script>

<template>
  <div v-if="bookingEnabled" class="booking-cta">
    <AppCard
      class="booking-cta__card d-flex align-center justify-center ga-2"
      color="primary"
      variant="flat"
      padding="4"
      @click="startBooking"
    >
      <v-icon icon="mdi-calendar-plus-outline" size="20" />
      <span class="booking-cta__label">開始預約</span>
    </AppCard>
  </div>
</template>

<style scoped>
.booking-cta {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  padding: 0 16px calc(12px + env(safe-area-inset-bottom));
  z-index: 10;
}

.booking-cta__card {
  cursor: pointer;
  color: rgb(var(--v-theme-on-primary));
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.booking-cta__card:active {
  transform: scale(0.97);
  box-shadow: none;
}

.booking-cta__label {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
</style>
