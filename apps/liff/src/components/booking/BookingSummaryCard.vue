<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Booking, BookingTimeSlot } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { fetchBookingServices, fetchBookingTimeSlots, fetchMyBookings } from '~/utils/booking-api';

const emit = defineEmits<{ visible: [value: boolean] }>();

const serviceName = ref('');
const slotTime = ref('');

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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
    slotTime.value = formatDateTime(next.slot.startAt);
    emit('visible', true);
  } catch {
    // 預約功能未開啟或查詢失敗時，安靜略過此卡片
    emit('visible', false);
  }
});
</script>

<template>
  <AppCard v-if="slotTime" class="h-100" :to="{ name: 'myBookings' }">
    <v-icon icon="mdi-calendar-check-outline" color="primary" size="28" class="mb-2" />
    <div class="text-caption text-medium-emphasis">即將到來的預約</div>
    <div class="text-body-1 font-weight-bold">{{ serviceName }}</div>
    <div class="text-caption text-medium-emphasis">{{ slotTime }}</div>
  </AppCard>
</template>
