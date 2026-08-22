<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type {
  BookingProvider,
  BookingService,
  BookingStatus,
  BookingTimeSlot,
} from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import {
  fetchBookingProviders,
  fetchBookingServices,
  fetchBookingTimeSlots,
} from '~/utils/booking-api';

const route = useRoute();

const serviceId = computed(() => String(route.params.serviceId));
const timeSlotId = computed(() => String(route.query.timeSlotId ?? ''));
const providerId = computed(() =>
  typeof route.query.providerId === 'string' ? route.query.providerId : undefined,
);
const status = computed(() => String(route.query.status ?? '') as BookingStatus);

const service = ref<BookingService | null>(null);
const slot = ref<BookingTimeSlot | null>(null);
const provider = ref<BookingProvider | null>(null);
const loading = ref(true);

const isConfirmed = computed(() => status.value === 'confirmed');

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

onMounted(async () => {
  try {
    const [services, slots, providers] = await Promise.all([
      fetchBookingServices(),
      fetchBookingTimeSlots(serviceId.value),
      providerId.value ? fetchBookingProviders() : Promise.resolve([]),
    ]);
    service.value = services.find((s) => s.id === serviceId.value) ?? null;
    slot.value = slots.find((s) => s.id === timeSlotId.value) ?? null;
    provider.value = providers.find((p) => p.id === providerId.value) ?? null;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="text-center">
    <v-icon
      :icon="isConfirmed ? 'mdi-check-circle-outline' : 'mdi-clock-outline'"
      :color="isConfirmed ? 'success' : 'warning'"
      size="64"
      class="mb-3"
    />
    <div class="text-h6 font-weight-bold mb-1">
      {{ isConfirmed ? '預約已確認' : '預約已送出' }}
    </div>
    <div class="text-caption text-medium-emphasis mb-6">
      {{ isConfirmed ? '我們已經為你保留這個時段' : '正在等待審核，結果會另行通知' }}
    </div>

    <div v-if="loading" class="text-center text-medium-emphasis py-8">載入中...</div>

    <AppCard v-else class="mb-4 text-left">
      <div class="d-flex justify-space-between py-1">
        <span class="text-caption text-medium-emphasis">服務項目</span>
        <span class="text-body-2 font-weight-medium">{{ service?.name ?? '—' }}</span>
      </div>
      <div class="d-flex justify-space-between py-1">
        <span class="text-caption text-medium-emphasis">預約日期</span>
        <span class="text-body-2 font-weight-medium">{{
          slot ? formatDate(slot.startAt) : '—'
        }}</span>
      </div>
      <div class="d-flex justify-space-between py-1">
        <span class="text-caption text-medium-emphasis">預約時間</span>
        <span class="text-body-2 font-weight-medium">{{
          slot ? formatTime(slot.startAt) : '—'
        }}</span>
      </div>
      <div class="d-flex justify-space-between py-1">
        <span class="text-caption text-medium-emphasis">服務人員</span>
        <span class="text-body-2 font-weight-medium">{{ provider?.name ?? '不指定' }}</span>
      </div>
    </AppCard>
  </div>
</template>
