<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type {
  Booking,
  BookingService,
  BookingTimeSlot,
  BookingStatus,
} from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { useToast } from '~/composables/useToast';
import {
  cancelBooking,
  fetchBookingServices,
  fetchBookingTimeSlots,
  fetchMyBookings,
} from '~/utils/booking-api';

const { showSuccess, showError } = useToast();

const bookings = ref<Booking[]>([]);
const servicesById = ref<Map<string, BookingService>>(new Map());
const slotsById = ref<Map<string, BookingTimeSlot>>(new Map());
const loading = ref(true);
const errorMessage = ref('');
const cancellingId = ref<string | null>(null);

const STATUS_LABEL: Record<BookingStatus, string> = {
  pendingReview: '待審核',
  confirmed: '已確認',
  rejected: '已拒絕',
  cancelled: '已取消',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function serviceName(booking: Booking): string {
  return servicesById.value.get(booking.serviceId)?.name ?? booking.serviceId;
}

function slotTime(booking: Booking): string {
  const slot = slotsById.value.get(booking.timeSlotId);
  return slot ? `${formatDateTime(slot.startAt)} - ${formatDateTime(slot.endAt)}` : '';
}

function canCancel(booking: Booking): boolean {
  if (booking.status !== 'confirmed' && booking.status !== 'pendingReview') return false;
  const slot = slotsById.value.get(booking.timeSlotId);
  if (!slot) return false;
  return new Date(slot.startAt).getTime() > Date.now();
}

async function loadBookings(): Promise<void> {
  loading.value = true;
  errorMessage.value = '';
  try {
    const [myBookings, services] = await Promise.all([fetchMyBookings(), fetchBookingServices()]);
    bookings.value = myBookings;
    servicesById.value = new Map(services.map((service) => [service.id, service]));

    const serviceIds = [...new Set(myBookings.map((b) => b.serviceId))];
    const slotLists = await Promise.all(
      serviceIds.map((id) => fetchBookingTimeSlots(id).catch(() => [] as BookingTimeSlot[])),
    );
    slotsById.value = new Map(slotLists.flat().map((slot) => [slot.id, slot]));
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function cancel(booking: Booking): Promise<void> {
  cancellingId.value = booking.id;
  try {
    await cancelBooking(booking.id);
    showSuccess('預約已取消');
    await loadBookings();
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
  } finally {
    cancellingId.value = null;
  }
}

const sortedBookings = computed(() =>
  [...bookings.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
);

onMounted(loadBookings);
</script>

<template>
  <div>
    <div class="text-h6 font-weight-bold mb-3">我的預約</div>

    <div v-if="loading" class="text-center text-medium-emphasis py-8">載入中...</div>
    <div v-else-if="errorMessage" class="text-error text-body-2">{{ errorMessage }}</div>

    <template v-else>
      <AppCard v-for="booking in sortedBookings" :key="booking.id" class="mb-3">
        <div class="d-flex justify-space-between align-start">
          <div>
            <div class="text-body-1 font-weight-bold">{{ serviceName(booking) }}</div>
            <div class="text-caption text-medium-emphasis">{{ slotTime(booking) }}</div>
          </div>
          <v-chip
            size="small"
            variant="flat"
            :color="
              booking.status === 'confirmed'
                ? 'success'
                : booking.status === 'pendingReview'
                  ? 'warning'
                  : 'error'
            "
          >
            {{ STATUS_LABEL[booking.status] }}
          </v-chip>
        </div>
        <div v-if="canCancel(booking)" class="d-flex justify-end mt-2">
          <v-btn
            size="small"
            variant="text"
            color="error"
            :loading="cancellingId === booking.id"
            @click="cancel(booking)"
          >
            取消預約
          </v-btn>
        </div>
      </AppCard>
      <div v-if="bookings.length === 0" class="text-caption text-medium-emphasis text-center py-8">
        尚未有任何預約
      </div>
    </template>
  </div>
</template>
