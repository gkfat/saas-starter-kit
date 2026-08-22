<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { BookingProvider, BookingService, BookingTimeSlot } from '@saas-starter-kit/shared';
import BookingBottomAction from '~/components/booking/BookingBottomAction.vue';
import BookingStepper from '~/components/booking/BookingStepper.vue';
import AppCard from '~/components/common/AppCard.vue';
import { useToast } from '~/composables/useToast';
import type { ApiError } from '~/utils/api-client';
import {
  createBooking,
  fetchBookingProviders,
  fetchBookingServices,
  fetchBookingTimeSlots,
} from '~/utils/booking-api';

const route = useRoute();
const router = useRouter();
const { showError } = useToast();

const serviceId = computed(() => String(route.params.serviceId));
const timeSlotId = computed(() => String(route.query.timeSlotId ?? ''));
const providerId = computed(() =>
  typeof route.query.providerId === 'string' ? route.query.providerId : undefined,
);

const service = ref<BookingService | null>(null);
const slot = ref<BookingTimeSlot | null>(null);
const provider = ref<BookingProvider | null>(null);
const loading = ref(true);
const submitting = ref(false);
const errorMessage = ref('');
const note = ref('');

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
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
});

async function submit(): Promise<void> {
  submitting.value = true;
  try {
    const booking = await createBooking({
      serviceId: serviceId.value,
      timeSlotId: timeSlotId.value,
      ...(providerId.value ? { providerId: providerId.value } : {}),
      ...(note.value.trim() ? { note: note.value.trim() } : {}),
    });
    router.push({
      name: 'bookingResult',
      params: { serviceId: serviceId.value },
      query: {
        timeSlotId: timeSlotId.value,
        ...(providerId.value ? { providerId: providerId.value } : {}),
        status: booking.status,
      },
    });
  } catch (e) {
    if ((e as ApiError).statusCode === 409) {
      showError('手慢了，這個時段的名額剛被搶光了');
    } else {
      showError(e instanceof Error ? e.message : String(e));
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <BookingStepper :step="3" />
    <div class="text-h6 font-weight-bold mb-3">確認預約</div>
    <div v-if="loading" class="text-center text-medium-emphasis py-8">載入中...</div>
    <div v-else-if="errorMessage" class="text-error text-body-2">{{ errorMessage }}</div>

    <template v-else>
      <AppCard class="mb-4">
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

      <div class="text-caption text-medium-emphasis mb-1">備註（選填）</div>
      <v-text-field
        v-model="note"
        variant="outlined"
        bg-color="white"
        rows="2"
        maxlength="200"
        placeholder="有什麼想讓服務人員先知道的嗎？"
        hide-details
      />

      <div class="booking-bottom-spacer" />
      <BookingBottomAction :loading="submitting" @click="submit">確認送出</BookingBottomAction>
    </template>
  </div>
</template>

<style scoped>
.booking-bottom-spacer {
  height: 72px;
}
</style>
