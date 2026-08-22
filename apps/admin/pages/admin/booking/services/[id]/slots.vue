<template>
  <div>
    <div class="d-flex flex-wrap ga-3 align-center justify-space-between">
      <div>
        <ButtonsAppButton
          kind="secondary"
          prepend-icon="mdi-arrow-left"
          :to="ROUTES.bookingServices"
        >
          {{ $t('bookingTimeSlots.back') }}
        </ButtonsAppButton>
        <LayoutPageHeader :title="$t('bookingTimeSlots.title')" class="mt-2" />
        <div v-if="service" class="text-body-2 text-medium-emphasis">
          {{ $t('bookingTimeSlots.subtitle', { name: service.name }) }}
        </div>
      </div>
      <div v-if="canWrite" class="d-flex ga-2">
        <ButtonsAppButton
          kind="secondary"
          prepend-icon="mdi-calendar-sync"
          @click="applyTemplateDialog = true"
        >
          {{ $t('bookingTimeSlots.applyTemplate') }}
        </ButtonsAppButton>
        <ButtonsAppButton
          kind="primary"
          :disabled="!hasDraftChanges"
          :loading="saving"
          @click="commitDraft"
        >
          {{ $t('bookingTimeSlots.commitDraft') }}
        </ButtonsAppButton>
      </div>
    </div>

    <CardsAppCard class="mt-4 pa-4">
      <div class="d-flex align-center justify-space-between mb-3">
        <ButtonsIconActionBtn icon="mdi-chevron-left" size="small" @click="goToMonth(-1)" />
        <div class="text-body-1 font-weight-bold">{{ monthLabel }}</div>
        <ButtonsIconActionBtn icon="mdi-chevron-right" size="small" @click="goToMonth(1)" />
      </div>

      <div class="calendar-grid calendar-grid--header">
        <div
          v-for="label in weekdayHeaderLabels"
          :key="label"
          class="text-caption text-medium-emphasis text-center"
        >
          {{ label }}
        </div>
      </div>

      <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="calendar-grid">
        <div
          v-for="cell in week"
          :key="cell.date ?? `blank-${weekIndex}-${Math.random()}`"
          class="calendar-cell"
          :class="{
            'calendar-cell--empty': !cell.date,
            'calendar-cell--draft': cell.date && draftByDate[cell.date] !== undefined,
            'calendar-cell--clickable': cell.date && canWrite,
          }"
          @click="cell.date && canWrite ? openDayEditor(cell.date) : undefined"
        >
          <template v-if="cell.date">
            <div class="d-flex align-center ga-1">
              <span class="text-caption">{{ Number(cell.date.slice(-2)) }}</span>
              <span
                v-if="holidaysByDate[cell.date]"
                class="holiday-dot"
                :title="holidaysByDate[cell.date]"
              />
            </div>
            <v-chip v-if="capacitySummaryForDate(cell.date).total > 0" size="x-small" class="mt-1">
              {{ t('bookingTimeSlots.booked') }} {{ capacitySummaryForDate(cell.date).booked }} /
              {{ t('bookingTimeSlots.limit') }} {{ capacitySummaryForDate(cell.date).total }}
            </v-chip>
          </template>
        </div>
      </div>

      <div v-if="currentMonthHolidays.length > 0" class="text-caption text-medium-emphasis mt-3">
        {{ t('bookingTimeSlots.holidaysNote', { list: currentMonthHolidays.join('、') }) }}
      </div>
    </CardsAppCard>

    <BookingDaySlotsDialog
      v-model="dayDialog"
      :date="editingDate ?? ''"
      :slots="editingDate ? effectiveSlotsForDate(editingDate) : []"
      @save="onDaySave"
    />

    <ApplyTemplateDialog
      v-model="applyTemplateDialog"
      :templates="templates ?? []"
      :year="viewYear"
      :month="viewMonth"
      @applied="onTemplateApplied"
    />
  </div>
</template>

<script setup lang="ts">
import { Permission } from '@saas-starter-kit/shared';
import type {
  BookingService,
  BookingSlotTemplate,
  BookingTimeSlot,
} from '@saas-starter-kit/shared';
import ApplyTemplateDialog from '~/components/booking/ApplyTemplateDialog.vue';
import BookingDaySlotsDialog, {
  type DaySlotDraft,
} from '~/components/booking/BookingDaySlotsDialog.vue';
import {
  formatDateOnly,
  generateDaySlots,
  weekdayDatesInMonth,
  type GeneratedTimeSlot,
} from '~/utils/booking-slot-generation';
import { ROUTES } from '~/config/app-routes';
import { useTimezoneStore } from '~/stores/timezone';
import dayjs from '~/utils/dayjs';
import { fetchTaiwanHolidays, type HolidaysByDate } from '~/utils/taiwan-calendar-api';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { hasPermission } = usePermission();
const { showSuccess, showError } = useToast();
const { apiFetch } = useApi();
const timezoneStore = useTimezoneStore();

const canWrite = computed(() => hasPermission(Permission.Bookings.Write));
const serviceId = String(route.params.id);

const { data: services } = useAuthFetch<BookingService[]>('/api/admin/booking/services', {
  default: () => [],
});
const service = computed(() => (services.value ?? []).find((s) => s.id === serviceId) ?? null);

const { data: slots, refresh } = useAuthFetch<BookingTimeSlot[]>(
  `/api/admin/booking/services/${serviceId}/slots`,
  { default: () => [] },
);

const { data: templates } = useAuthFetch<BookingSlotTemplate[]>(
  '/api/admin/booking/slot-templates',
  { default: () => [] },
);

// ---- Calendar month navigation ----

const now = new Date();
const viewYear = ref(now.getFullYear());
const viewMonth = ref(now.getMonth());

const monthLabel = computed(() =>
  t('bookingTimeSlots.monthLabel', {
    year: viewYear.value,
    month: viewMonth.value + 1,
  }),
);

function goToMonth(delta: number) {
  const next = new Date(viewYear.value, viewMonth.value + delta, 1);
  viewYear.value = next.getFullYear();
  viewMonth.value = next.getMonth();
}

// ---- Taiwan public holidays (small red dot in-cell + a footnote listing names) ----

const holidaysByDate = ref<HolidaysByDate>({});

watch(
  [viewYear, viewMonth],
  async ([year, month]) => {
    holidaysByDate.value = await fetchTaiwanHolidays(year, month);
  },
  { immediate: true },
);

const currentMonthHolidays = computed(() =>
  Object.entries(holidaysByDate.value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([date, caption]) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))} ${caption}`,
    ),
);

// Monday-first, matching WeekdayPicker's display order.
const weekdayHeaderLabels = computed(() =>
  [1, 2, 3, 4, 5, 6, 0].map((value) => t(`bookingSlotTemplates.weekdayShort.${value}`)),
);

type CalendarCell = { date: string | null };

const weeks = computed<CalendarCell[][]>(() => {
  const year = viewYear.value;
  const month = viewMonth.value;
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (firstDay.getDay() + 6) % 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < leading; i++) cells.push({ date: null });
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: formatDateOnly(new Date(year, month, day)) });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null });

  const result: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
  return result;
});

// ---- Draft state ----
// Keyed by date (`YYYY-MM-DD`). A date present here (even as an empty array) means the admin
// has touched that day — its final content will be persisted on "設定完成"; untouched dates
// are left alone entirely.

const draftByDate = ref<Record<string, DaySlotDraft[]>>({});
const hasDraftChanges = computed(() => Object.keys(draftByDate.value).length > 0);

function localDateOf(iso: string): string {
  return dayjs(iso).tz(timezoneStore.selected).format('YYYY-MM-DD');
}

function persistedSlotsForDate(date: string): DaySlotDraft[] {
  return (slots.value ?? [])
    .filter((slot) => localDateOf(slot.startAt) === date)
    .map((slot) => ({
      id: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      capacity: slot.capacity,
      confirmedCount: slot.confirmedCount,
      pendingCount: slot.pendingCount,
    }));
}

function effectiveSlotsForDate(date: string): DaySlotDraft[] {
  return draftByDate.value[date] ?? persistedSlotsForDate(date);
}

function capacitySummaryForDate(date: string): { booked: number; total: number } {
  return effectiveSlotsForDate(date).reduce(
    (sum, slot) => ({
      booked: sum.booked + slot.confirmedCount + slot.pendingCount,
      total: sum.total + slot.capacity,
    }),
    { booked: 0, total: 0 },
  );
}

function mergeGeneratedIntoDraft(slotsByDate: Map<string, GeneratedTimeSlot[]>) {
  const next = { ...draftByDate.value };
  for (const [date, generated] of slotsByDate) {
    next[date] = generated.map((slot) => ({ ...slot, confirmedCount: 0, pendingCount: 0 }));
  }
  draftByDate.value = next;
}

// ---- Day editor ----

const dayDialog = ref(false);
const editingDate = ref<string | null>(null);

function openDayEditor(date: string) {
  editingDate.value = date;
  dayDialog.value = true;
}

function onDaySave(date: string, daySlots: DaySlotDraft[]) {
  draftByDate.value = { ...draftByDate.value, [date]: daySlots };
}

// ---- Apply template ----

const applyTemplateDialog = ref(false);

function onTemplateApplied(slotsByDate: Map<string, GeneratedTimeSlot[]>) {
  mergeGeneratedIntoDraft(slotsByDate);
}

// Service creation can redirect here with `?applyTemplate=<templateId>` (see
// BookingServiceFormDialog.vue) to pre-fill the current month's draft from that template —
// the admin still has to press "設定完成" to persist it, same as a manual apply.
watch(
  () => templates.value,
  (list) => {
    const templateId = route.query.applyTemplate;
    if (typeof templateId !== 'string' || !list) return;
    const template = list.find((item) => item.id === templateId);
    if (!template) return;

    const slotsByDate = new Map<string, GeneratedTimeSlot[]>();
    for (const date of weekdayDatesInMonth(viewYear.value, viewMonth.value, template.weekdays)) {
      slotsByDate.set(
        date,
        generateDaySlots(
          date,
          template.dailyStartTime,
          template.dailyEndTime,
          template.granularityMinutes,
          timezoneStore.selected,
          template.defaultCapacity,
        ),
      );
    }
    mergeGeneratedIntoDraft(slotsByDate);

    // Drop the query param so refreshing/navigating back doesn't re-apply it.
    router.replace({ query: { ...route.query, applyTemplate: undefined } });
  },
  { immediate: true },
);

// ---- Commit draft ----

const saving = ref(false);

async function commitDraft() {
  saving.value = true;
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;

  const toCreate: Array<{ startAt: string; endAt: string; capacity: number }> = [];

  for (const [date, draftSlots] of Object.entries(draftByDate.value)) {
    const persisted = persistedSlotsForDate(date);
    const draftIds = new Set(draftSlots.filter((s) => s.id).map((s) => s.id));

    for (const draftSlot of draftSlots) {
      if (!draftSlot.id) {
        toCreate.push({
          startAt: draftSlot.startAt,
          endAt: draftSlot.endAt,
          capacity: draftSlot.capacity,
        });
        continue;
      }
      const original = persisted.find((s) => s.id === draftSlot.id);
      if (
        original &&
        (original.startAt !== draftSlot.startAt ||
          original.endAt !== draftSlot.endAt ||
          original.capacity !== draftSlot.capacity)
      ) {
        const result = await apiFetch(
          `/api/admin/booking/services/${serviceId}/slots/${draftSlot.id}`,
          {
            method: 'PATCH',
            body: {
              startAt: draftSlot.startAt,
              endAt: draftSlot.endAt,
              capacity: draftSlot.capacity,
            },
            silent: true,
          },
        ).catch(() => null);
        if (result !== null) updated += 1;
        else skipped += 1;
      }
    }

    for (const persistedSlot of persisted) {
      if (draftIds.has(persistedSlot.id)) continue;
      // Deletion is refused server-side (409) for slots that already have bookings — that's
      // an expected outcome when a template overwrite lands on a day with existing bookings,
      // not an error to surface per-item; just count it and report a summary at the end.
      const result = await apiFetch(
        `/api/admin/booking/services/${serviceId}/slots/${persistedSlot.id}`,
        {
          method: 'DELETE',
          silent: true,
        },
      ).catch(() => null);
      if (result !== null) deleted += 1;
      else skipped += 1;
    }
  }

  if (toCreate.length > 0) {
    const result = await apiFetch<{ created: BookingTimeSlot[]; skippedCount: number }>(
      `/api/admin/booking/services/${serviceId}/slots/bulk`,
      { method: 'POST', body: { slots: toCreate } },
    );
    if (result !== null) created = result.created.length;
  }

  draftByDate.value = {};
  await refresh();
  saving.value = false;

  if (skipped > 0) {
    showError(t('bookingTimeSlots.commitPartialFailure', { skipped }));
  } else {
    showSuccess(t('bookingTimeSlots.commitSuccess', { created, updated, deleted }));
  }
}
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-grid + .calendar-grid {
  margin-top: 4px;
}

.calendar-grid--header {
  margin-bottom: 4px;
}

.calendar-cell {
  min-height: 64px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 8px;
}

.calendar-cell--empty {
  border-color: transparent;
}

.calendar-cell--clickable {
  cursor: pointer;
}

.calendar-cell--draft {
  border-color: rgb(var(--v-theme-warning));
  background-color: rgba(var(--v-theme-warning), 0.08);
}

.holiday-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: rgb(var(--v-theme-error));
  flex-shrink: 0;
}
</style>
