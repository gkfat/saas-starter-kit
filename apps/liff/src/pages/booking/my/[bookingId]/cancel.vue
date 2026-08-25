<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AnalyticsEvent } from '@saas-starter-kit/shared';
import BookingBottomAction from '~/components/booking/BookingBottomAction.vue';
import AppCard from '~/components/common/AppCard.vue';
import { useToast } from '~/composables/useToast';
import { trackEvent } from '~/utils/analytics';
import { cancelBooking } from '~/utils/booking-api';

const props = defineProps<{ bookingId: string }>();

const route = useRoute();
const router = useRouter();
const { showSuccess, showError } = useToast();

const serviceName = String(route.query.serviceName ?? '');
const timeRange = String(route.query.timeRange ?? '');
const submitting = ref(false);

async function confirmCancel(): Promise<void> {
  submitting.value = true;
  try {
    await cancelBooking(props.bookingId);
    trackEvent(AnalyticsEvent.BookingCancel, { bookingId: props.bookingId });
    showSuccess('預約已取消');
    router.push({ name: 'myBookings' });
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <div class="text-h6 font-weight-bold mb-3">取消預約</div>

    <AppCard class="mb-4">
      <div class="d-flex justify-space-between py-1">
        <span class="text-caption text-medium-emphasis">服務項目</span>
        <span class="text-body-2 font-weight-medium">{{ serviceName || '—' }}</span>
      </div>
      <div class="d-flex justify-space-between py-1">
        <span class="text-caption text-medium-emphasis">預約時間</span>
        <span class="text-body-2 font-weight-medium">{{ timeRange || '—' }}</span>
      </div>
    </AppCard>

    <div class="text-body-2 text-medium-emphasis">取消後將無法復原，確定要取消這筆預約嗎？</div>

    <div class="booking-bottom-spacer" />
    <BookingBottomAction color="error" :loading="submitting" @click="confirmCancel">
      確認取消預約
    </BookingBottomAction>
  </div>
</template>

<style scoped>
.booking-bottom-spacer {
  height: 72px;
}
</style>
