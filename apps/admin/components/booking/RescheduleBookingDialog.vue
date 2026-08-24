<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ $t('bookings.rescheduleTitle') }}</v-card-title>
      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-1">
          {{ $t('bookings.currentTimeSlot') }}
        </div>
        <div class="text-body-2 font-weight-medium mb-4">{{ currentSlotLabel }}</div>

        <div class="text-caption text-medium-emphasis mb-1">{{ $t('bookings.newTimeSlot') }}</div>
        <v-select
          v-model="selectedSlotId"
          :items="slotOptions"
          item-title="label"
          item-value="value"
          :loading="loading"
          :no-data-text="$t('bookings.noAvailableTimeSlot')"
          variant="outlined"
          density="comfortable"
          hide-details
        />

        <div class="text-caption text-medium-emphasis mb-1 mt-4">
          {{ $t('bookings.staffNote') }}
        </div>
        <v-textarea
          v-model="note"
          :placeholder="$t('bookings.staffNotePlaceholder')"
          variant="outlined"
          density="comfortable"
          rows="2"
          maxlength="200"
          hide-details
        />
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" :disabled="submitting" @click="close">
          {{ $t('common.cancel') }}
        </ButtonsAppButton>
        <ButtonsAppButton
          kind="primary"
          :disabled="!selectedSlotId"
          :loading="submitting"
          @click="submit"
        >
          {{ $t('common.confirm') }}
        </ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import type { AdminBookingRow, BookingTimeSlot } from '@saas-starter-kit/shared';
import { useTimezoneStore } from '~/stores/timezone';
import dayjs from '~/utils/dayjs';

const props = defineProps<{
  modelValue: boolean;
  booking: AdminBookingRow | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  rescheduled: [];
}>();

const { t } = useI18n();
const { apiFetch } = useApi();
const { showSuccess } = useToast();
const timezoneStore = useTimezoneStore();

const loading = ref(false);
const submitting = ref(false);
const slots = ref<BookingTimeSlot[]>([]);
const selectedSlotId = ref<string | null>(null);
const note = ref('');

function formatSlot(slot: { startAt: string; endAt: string }): string {
  const format = (value: string) => dayjs(value).tz(timezoneStore.selected).format('MM/DD HH:mm');
  return `${format(slot.startAt)} - ${dayjs(slot.endAt).tz(timezoneStore.selected).format('HH:mm')}`;
}

const currentSlotLabel = computed(() =>
  props.booking
    ? formatSlot({ startAt: props.booking.timeSlotStartAt, endAt: props.booking.timeSlotEndAt })
    : '',
);

const slotOptions = computed(() =>
  slots.value.map((slot) => ({
    value: slot.id,
    label: `${formatSlot(slot)}（${t('bookings.remainingCapacity', { count: slot.capacity - slot.confirmedCount - slot.pendingCount })}）`,
  })),
);

watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.booking) return;
    selectedSlotId.value = null;
    note.value = '';
    loading.value = true;
    const result = await apiFetch<BookingTimeSlot[]>(
      `/api/admin/booking/services/${props.booking.serviceId}/slots`,
    );
    const now = Date.now();
    slots.value = (result ?? [])
      .filter(
        (slot) =>
          slot.id !== props.booking?.timeSlotId &&
          new Date(slot.startAt).getTime() > now &&
          slot.confirmedCount + slot.pendingCount < slot.capacity,
      )
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
    loading.value = false;
  },
);

function close() {
  emit('update:modelValue', false);
}

async function submit() {
  if (!props.booking || !selectedSlotId.value) return;
  submitting.value = true;
  const trimmedNote = note.value.trim();
  const result = await apiFetch(`/api/admin/booking/bookings/${props.booking.id}/reschedule`, {
    method: 'PATCH',
    body: { timeSlotId: selectedSlotId.value, ...(trimmedNote ? { note: trimmedNote } : {}) },
  });
  submitting.value = false;
  if (result !== null) {
    showSuccess(t('bookings.rescheduleSuccess'));
    emit('rescheduled');
    close();
  }
}
</script>
