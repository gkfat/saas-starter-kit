<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Booking, BookingTimeSlot } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { fetchBookingServices, fetchBookingTimeSlots, fetchMyBookings } from '~/utils/booking-api';

const emit = defineEmits<{ visible: [value: boolean] }>();

const serviceName = ref('');
const slotMonth = ref('');
const slotDay = ref('');
const slotTime = ref('');

function applySlotDate(value: string): void {
  const date = new Date(value);
  slotMonth.value = date.toLocaleString('zh-TW', { month: 'short' });
  slotDay.value = String(date.getDate());
  slotTime.value = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

onMounted(async () => {
  try {
    const bookings = await fetchMyBookings();
    const upcoming = bookings.filter(
      (b: Booking) => b.status === 'confirmed' || b.status === 'pendingReview',
    );
    if (upcoming.length === 0) {
      emit('visible', false);
      return;
    }

    const services = await fetchBookingServices();
    const serviceIds = [...new Set(upcoming.map((b) => b.serviceId))];
    const slotLists = await Promise.all(
      serviceIds.map((id) => fetchBookingTimeSlots(id).catch(() => [] as BookingTimeSlot[])),
    );
    const slotsById = new Map(slotLists.flat().map((slot) => [slot.id, slot]));
    const servicesById = new Map(services.map((service) => [service.id, service]));

    const next = upcoming
      .map((booking) => ({ booking, slot: slotsById.get(booking.timeSlotId) }))
      .filter(
        (entry): entry is { booking: Booking; slot: BookingTimeSlot } =>
          !!entry.slot && new Date(entry.slot.startAt).getTime() > Date.now(),
      )
      .sort((a, b) => a.slot.startAt.localeCompare(b.slot.startAt))[0];

    if (!next) {
      emit('visible', false);
      return;
    }

    serviceName.value = servicesById.get(next.booking.serviceId)?.name ?? '';
    applySlotDate(next.slot.startAt);
    emit('visible', true);
  } catch {
    // 預約功能未開啟或查詢失敗時，安靜略過此卡片
    emit('visible', false);
  }
});
</script>

<template>
  <AppCard
    v-if="slotTime"
    class="h-100 booking-summary-card"
    padding="0"
    :to="{ name: 'myBookings' }"
  >
    <div class="d-flex align-stretch">
      <div class="booking-summary-card__date">
        <span class="booking-summary-card__month">{{ slotMonth }}</span>
        <span class="booking-summary-card__day">{{ slotDay }}</span>
      </div>
      <div class="booking-summary-card__body">
        <div class="text-caption text-medium-emphasis">即將到來的預約</div>
        <div class="text-h6 font-weight-bold booking-summary-card__service">{{ serviceName }}</div>
        <div class="text-body-2 text-medium-emphasis">{{ slotTime }}</div>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
.booking-summary-card__date {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  padding: 12px 8px;
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}

.booking-summary-card__month {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.booking-summary-card__day {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.1;
}

.booking-summary-card__body {
  flex: 1 1 auto;
  min-width: 0;
  padding: 12px 16px;
}

.booking-summary-card__service {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
