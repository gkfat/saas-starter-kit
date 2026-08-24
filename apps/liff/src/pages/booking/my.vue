<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type {
  Booking,
  BookingService,
  BookingTimeSlot,
  BookingStatus,
} from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { fetchBookingServices, fetchBookingTimeSlots, fetchMyBookings } from '~/utils/booking-api';

const router = useRouter();

const bookings = ref<Booking[]>([]);
const servicesById = ref<Map<string, BookingService>>(new Map());
const slotsById = ref<Map<string, BookingTimeSlot>>(new Map());
const loading = ref(true);
const errorMessage = ref('');
const activeTab = ref<'upcoming' | 'completed' | 'cancelled'>('upcoming');

const STATUS_LABEL: Record<BookingStatus, string> = {
  pendingReview: '店家確認中',
  confirmed: '預約成功',
  rejected: '已取消',
  cancelled: '已取消',
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  pendingReview: 'warning',
  confirmed: 'success',
  rejected: 'error',
  cancelled: 'error',
};

function formatDate(value: string): { month: string; day: string } {
  const date = new Date(value);
  return {
    month: date.toLocaleString('zh-TW', { month: 'short' }),
    day: String(date.getDate()),
  };
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

function serviceName(booking: Booking): string {
  return servicesById.value.get(booking.serviceId)?.name ?? booking.serviceId;
}

function slot(booking: Booking): BookingTimeSlot | undefined {
  return slotsById.value.get(booking.timeSlotId);
}

function statusLabel(booking: Booking): string {
  if (booking.status === 'confirmed' && !isUpcoming(booking)) return '已完成';
  return STATUS_LABEL[booking.status];
}

function timeRangeLabel(booking: Booking): string {
  const s = slot(booking);
  if (!s) return '';
  return `${formatTime(s.startAt)} - ${formatTime(s.endAt)}`;
}

function isCancelled(booking: Booking): boolean {
  return booking.status === 'rejected' || booking.status === 'cancelled';
}

function isUpcoming(booking: Booking): boolean {
  if (isCancelled(booking)) return false;
  const s = slot(booking);
  if (!s) return false;
  return new Date(s.startAt).getTime() > Date.now();
}

function canCancel(booking: Booking): boolean {
  if (booking.status !== 'confirmed' && booking.status !== 'pendingReview') return false;
  const s = slot(booking);
  if (!s) return false;
  return new Date(s.startAt).getTime() > Date.now();
}

function goCancel(booking: Booking): void {
  router.push({
    name: 'bookingCancelConfirm',
    params: { bookingId: booking.id },
    query: {
      serviceName: serviceName(booking),
      timeRange: timeRangeLabel(booking),
    },
  });
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
    slotsById.value = new Map(slotLists.flat().map((s) => [s.id, s]));
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

const sortedBookings = computed(() =>
  [...bookings.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
);

const upcomingBookings = computed(() => sortedBookings.value.filter(isUpcoming));
const cancelledBookings = computed(() => sortedBookings.value.filter(isCancelled));
const completedBookings = computed(() =>
  sortedBookings.value.filter((b) => !isUpcoming(b) && !isCancelled(b)),
);
const activeBookings = computed(() => {
  if (activeTab.value === 'upcoming') return upcomingBookings.value;
  if (activeTab.value === 'completed') return completedBookings.value;
  return cancelledBookings.value;
});

onMounted(loadBookings);
</script>

<template>
  <div class="my-bookings">
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-h5 font-weight-bold">我的預約</div>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        density="comfortable"
        :loading="loading"
        @click="loadBookings"
      />
    </div>

    <v-tabs
      v-model="activeTab"
      grow
      bg-color="white"
      selected-class="bg-warning"
      hide-slider
      class="rounded-lg mb-4"
    >
      <v-tab value="upcoming">即將到來</v-tab>
      <v-tab value="completed">已完成</v-tab>
      <v-tab value="cancelled">已取消</v-tab>
    </v-tabs>

    <div v-if="loading" class="mt-2">
      <v-skeleton-loader
        v-for="n in 3"
        :key="n"
        type="list-item-two-line"
        class="mb-3 rounded-lg"
      />
    </div>

    <div v-else-if="errorMessage" class="text-error text-body-2">{{ errorMessage }}</div>

    <template v-else>
      <AppCard
        v-for="booking in activeBookings"
        :key="booking.id"
        padding="0"
        class="mb-3 overflow-hidden"
      >
        <div class="d-flex align-stretch">
          <div class="booking-date" :class="{ 'booking-date--muted': !canCancel(booking) }">
            <span class="booking-date__month">{{
              formatDate(slot(booking)?.startAt ?? '').month
            }}</span>
            <span class="booking-date__day">{{
              formatDate(slot(booking)?.startAt ?? '').day
            }}</span>
          </div>

          <div class="flex-1-1 min-width-0 pa-4">
            <div class="d-flex justify-space-between align-start">
              <div class="text-body-1 font-weight-bold">{{ serviceName(booking) }}</div>
              <v-chip
                size="small"
                variant="tonal"
                :color="STATUS_COLOR[booking.status]"
                class="font-weight-medium flex-shrink-0 ml-2"
              >
                {{ statusLabel(booking) }}
              </v-chip>
            </div>
            <div class="text-caption text-medium-emphasis mt-1">{{ timeRangeLabel(booking) }}</div>
          </div>

          <button
            v-if="canCancel(booking)"
            type="button"
            class="booking-cancel"
            @click="goCancel(booking)"
          >
            <v-icon icon="mdi-close" size="18" />
            <span class="text-caption">取消</span>
          </button>
        </div>
      </AppCard>

      <div v-if="activeBookings.length === 0" class="my-bookings__empty">
        <v-icon icon="mdi-calendar-blank-outline" size="40" color="primary" class="mb-3" />
        <div class="text-body-2 font-weight-medium">
          {{
            activeTab === 'upcoming'
              ? '尚無即將到來的預約'
              : activeTab === 'completed'
                ? '尚無已完成的預約紀錄'
                : '尚無已取消的預約紀錄'
          }}
        </div>
        <template v-if="activeTab === 'upcoming'">
          <div class="text-caption text-medium-emphasis mt-1 mb-4">
            預約一次服務，開始你的第一筆紀錄
          </div>
          <v-btn color="primary" variant="flat" rounded="lg" :to="{ name: 'bookingServices' }">
            前往預約
          </v-btn>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.my-bookings__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 16px;
}

.booking-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 68px;
  padding: 16px 8px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.booking-date--muted {
  background: rgba(var(--v-theme-on-surface), 0.26);
  color: rgb(var(--v-theme-surface));
}

.booking-date__month {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.booking-date__day {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.15;
}

.booking-cancel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 56px;
  padding: 8px;
  background: rgba(var(--v-theme-error), 0.08);
  color: rgb(var(--v-theme-error));
  border-left: 1px solid rgba(var(--v-theme-error), 0.18);
  cursor: pointer;
}

.booking-cancel:hover {
  background: rgba(var(--v-theme-error), 0.14);
}
</style>
