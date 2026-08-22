<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { BookingTimeSlot } from '@saas-starter-kit/shared';
import BookingBottomAction from '~/components/booking/BookingBottomAction.vue';
import BookingStepper from '~/components/booking/BookingStepper.vue';
import AppCard from '~/components/common/AppCard.vue';
import { fetchBookingTimeSlots } from '~/utils/booking-api';

const route = useRoute();
const router = useRouter();

const slots = ref<BookingTimeSlot[]>([]);
const loading = ref(true);
const errorMessage = ref('');

const serviceId = computed(() => String(route.params.serviceId));

function remainingCapacity(slot: BookingTimeSlot): number {
  return slot.capacity - slot.confirmedCount - slot.pendingCount;
}

function isPastSlot(slot: BookingTimeSlot): boolean {
  return new Date(slot.startAt).getTime() <= Date.now();
}

function isBookableSlot(slot: BookingTimeSlot): boolean {
  return remainingCapacity(slot) > 0 && !isPastSlot(slot);
}

function dateKey(value: string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

async function loadSlots(): Promise<void> {
  loading.value = true;
  errorMessage.value = '';
  try {
    slots.value = await fetchBookingTimeSlots(serviceId.value);
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

// ---- Calendar ----

const now = new Date();
const viewYear = ref(now.getFullYear());
const viewMonth = ref(now.getMonth());
const selectedDate = ref<string | null>(null);

const datesWithSlots = computed(
  () => new Set(slots.value.filter(isBookableSlot).map((slot) => dateKey(slot.startAt))),
);

const monthLabel = computed(() => `${viewYear.value} 年 ${viewMonth.value + 1} 月`);

type CalendarCell = { day: number; date: string } | null;

const calendarCells = computed<CalendarCell[]>(() => {
  const year = viewYear.value;
  const month = viewMonth.value;
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (firstDay.getDay() + 6) % 7;
  const pad = (n: number) => String(n).padStart(2, '0');

  const cells: CalendarCell[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, date: `${year}-${pad(month + 1)}-${pad(day)}` });
  }
  return cells;
});

function goToMonth(delta: number) {
  const next = new Date(viewYear.value, viewMonth.value + delta, 1);
  viewYear.value = next.getFullYear();
  viewMonth.value = next.getMonth();
  selectedDate.value = null;
  selectedSlotId.value = null;
}

function selectDate(cell: CalendarCell) {
  if (!cell || !datesWithSlots.value.has(cell.date)) return;
  selectedDate.value = cell.date;
  selectedSlotId.value = null;
}

const slotsForSelectedDate = computed(() =>
  slots.value
    .filter((slot) => selectedDate.value && dateKey(slot.startAt) === selectedDate.value)
    .sort((a, b) => a.startAt.localeCompare(b.startAt)),
);

const selectedSlotId = ref<string | null>(null);

function chooseSlot(slot: BookingTimeSlot) {
  if (!isBookableSlot(slot)) return;
  selectedSlotId.value = slot.id;
}

function goNext() {
  if (!selectedSlotId.value) return;
  router.push({
    name: 'bookingProvider',
    params: { serviceId: serviceId.value },
    query: { timeSlotId: selectedSlotId.value },
  });
}

watch(serviceId, loadSlots);
onMounted(loadSlots);
</script>

<template>
  <div>
    <BookingStepper :step="1" />
    <div class="d-flex align-center ga-2 mb-3">
      <v-btn icon="mdi-arrow-left" variant="text" density="comfortable" @click="router.back()" />
      <div class="text-h6 font-weight-bold">選擇日期與時段</div>
    </div>

    <div v-if="loading" class="text-center text-medium-emphasis py-8">載入中...</div>
    <div v-else-if="errorMessage" class="text-error text-body-2">{{ errorMessage }}</div>

    <template v-else>
      <AppCard class="mb-3">
        <div class="d-flex align-center justify-space-between mb-2">
          <v-btn
            icon="mdi-chevron-left"
            variant="text"
            density="comfortable"
            @click="goToMonth(-1)"
          />
          <div class="text-body-1 font-weight-bold">{{ monthLabel }}</div>
          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            density="comfortable"
            @click="goToMonth(1)"
          />
        </div>
        <div class="calendar-grid">
          <button
            v-for="(cell, index) in calendarCells"
            :key="index"
            type="button"
            class="calendar-day"
            :class="{
              'calendar-day--empty': !cell,
              'calendar-day--available': cell && datesWithSlots.has(cell.date),
              'calendar-day--selected': cell && selectedDate === cell.date,
            }"
            :disabled="!cell || !datesWithSlots.has(cell.date)"
            @click="selectDate(cell)"
          >
            {{ cell?.day ?? '' }}
          </button>
        </div>
      </AppCard>

      <div v-if="selectedDate">
        <div class="text-body-2 font-weight-medium mb-2">{{ selectedDate }} 可預約時段</div>
        <div class="d-flex flex-wrap ga-2">
          <v-chip
            v-for="slot in slotsForSelectedDate"
            :key="slot.id"
            class="slot-chip"
            :class="{
              'slot-chip--disabled': !isBookableSlot(slot),
              'slot-chip--selected': selectedSlotId === slot.id,
            }"
            :disabled="!isBookableSlot(slot)"
            :prepend-icon="isBookableSlot(slot) ? undefined : 'mdi-cancel'"
            :color="isBookableSlot(slot) ? 'primary' : undefined"
            :variant="isBookableSlot(slot) ? 'flat' : 'flat'"
            @click="chooseSlot(slot)"
          >
            {{ formatTime(slot.startAt) }}
          </v-chip>
        </div>
      </div>
      <div v-else class="text-caption text-medium-emphasis text-center py-8">
        {{
          datesWithSlots.size === 0 ? '目前尚未開放任何時段' : '請先在月曆上選擇一個有時段的日期'
        }}
      </div>

      <div class="booking-bottom-spacer" />
      <BookingBottomAction :disabled="!selectedSlotId" @click="goNext">下一步</BookingBottomAction>
    </template>
  </div>
</template>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  min-height: 40px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: none;
  font-size: 0.875rem;
}

.calendar-day--empty {
  visibility: hidden;
}

.calendar-day--available {
  border-color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.calendar-day:disabled:not(.calendar-day--empty) {
  color: rgba(var(--v-theme-on-surface), 0.35);
  cursor: not-allowed;
}

.calendar-day--selected {
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.slot-chip--disabled.v-chip {
  opacity: 1;
  background-color: rgba(var(--v-theme-on-surface), 0.08) !important;
  color: rgba(var(--v-theme-on-surface), 0.4) !important;
}

.slot-chip--selected.v-chip {
  outline: 2px solid rgb(var(--v-theme-on-surface));
  outline-offset: 1px;
}

.booking-bottom-spacer {
  height: 72px;
}
</style>
