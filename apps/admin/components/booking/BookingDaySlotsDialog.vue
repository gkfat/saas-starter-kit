<template>
  <v-dialog :model-value="modelValue" max-width="560" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{
        $t('bookingTimeSlots.dayEditorTitle', { date })
      }}</v-card-title>
      <v-card-text>
        <v-row v-for="row in rows" :key="row.key" no-gutters class="ga-3 align-center mb-3">
          <v-col>
            <div class="text-caption text-medium-emphasis mb-1">
              {{ $t('bookingTimeSlots.startAt') }}
            </div>
            <CommonTimePicker v-model="row.startTime" />
          </v-col>
          <v-col>
            <div class="text-caption text-medium-emphasis mb-1">
              {{ $t('bookingTimeSlots.endAt') }}
            </div>
            <CommonTimePicker v-model="row.endTime" />
          </v-col>
          <v-col cols="2">
            <div class="text-caption text-medium-emphasis mb-1">
              {{ $t('bookingTimeSlots.booked') }}
            </div>
            <div class="text-body-2 d-flex align-center booked-reference">
              {{ row.confirmedCount + row.pendingCount }}
            </div>
          </v-col>
          <v-col cols="3">
            <div class="text-caption text-medium-emphasis mb-1">
              {{ $t('bookingTimeSlots.capacity') }}
            </div>
            <v-text-field
              v-model.number="row.capacity"
              type="number"
              min="1"
              density="compact"
              variant="outlined"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="auto" class="align-self-end">
            <ButtonsIconActionBtn
              icon="mdi-delete-outline"
              class="text-error"
              :disabled="row.confirmedCount + row.pendingCount > 0"
              :title="
                row.confirmedCount + row.pendingCount > 0
                  ? $t('bookingTimeSlots.cannotDeleteInUse')
                  : ''
              "
              @click="removeRow(row.key)"
            />
          </v-col>
        </v-row>

        <div v-if="rows.length === 0" class="text-caption text-medium-emphasis text-center py-4">
          {{ $t('bookingTimeSlots.noData') }}
        </div>

        <ButtonsAppButton kind="secondary" prepend-icon="mdi-plus" @click="addRow">
          {{ $t('bookingTimeSlots.addRow') }}
        </ButtonsAppButton>

        <div v-if="rowError" class="text-caption text-error mt-2">{{ rowError }}</div>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" @click="close">
          {{ $t('common.cancel') }}
        </ButtonsAppButton>
        <ButtonsAppButton kind="primary" @click="save">
          {{ $t('common.confirm') }}
        </ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import { useTimezoneStore } from '~/stores/timezone';
import dayjs from '~/utils/dayjs';
import { formatTimeOfDay, parseTimeOfDay } from '~/utils/booking-slot-generation';

export type DaySlotDraft = {
  id?: string;
  startAt: string;
  endAt: string;
  capacity: number;
  confirmedCount: number;
  pendingCount: number;
};

type TimeParts = { hours: number; minutes: number };
type Row = {
  key: string;
  id?: string;
  startTime: TimeParts | null;
  endTime: TimeParts | null;
  capacity: number;
  confirmedCount: number;
  pendingCount: number;
};

const props = defineProps<{
  modelValue: boolean;
  date: string;
  slots: DaySlotDraft[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [date: string, slots: DaySlotDraft[]];
}>();

const { t } = useI18n();
const timezoneStore = useTimezoneStore();

const rows = ref<Row[]>([]);
const rowError = ref('');
let nextKey = 0;

function toRow(slot: DaySlotDraft): Row {
  return {
    key: String(nextKey++),
    id: slot.id,
    startTime: parseTimeOfDay(formatTimeOfDay(zonedTimeOf(slot.startAt))),
    endTime: parseTimeOfDay(formatTimeOfDay(zonedTimeOf(slot.endAt))),
    capacity: slot.capacity,
    confirmedCount: slot.confirmedCount,
    pendingCount: slot.pendingCount,
  };
}

function zonedTimeOf(iso: string): TimeParts {
  const zoned = dayjs(iso).tz(timezoneStore.selected);
  return { hours: zoned.hour(), minutes: zoned.minute() };
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    rowError.value = '';
    rows.value = props.slots.map(toRow);
  },
);

function addRow() {
  rows.value.push({
    key: String(nextKey++),
    startTime: null,
    endTime: null,
    capacity: 1,
    confirmedCount: 0,
    pendingCount: 0,
  });
}

function removeRow(key: string) {
  rows.value = rows.value.filter((row) => row.key !== key);
}

function close() {
  emit('update:modelValue', false);
}

function toIso(time: TimeParts): string {
  const timeString = formatTimeOfDay(time);
  return dayjs.tz(`${props.date}T${timeString}:00`, timezoneStore.selected).toISOString();
}

function save() {
  for (const row of rows.value) {
    if (!row.startTime || !row.endTime) {
      rowError.value = t('bookingTimeSlots.startAtRequired');
      return;
    }
    if (formatTimeOfDay(row.endTime) <= formatTimeOfDay(row.startTime)) {
      rowError.value = t('bookingTimeSlots.scheduleInvalid');
      return;
    }
    if (!row.capacity || row.capacity < 1) {
      rowError.value = t('bookingTimeSlots.capacityRequired');
      return;
    }
  }
  rowError.value = '';

  const result: DaySlotDraft[] = rows.value.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    startAt: toIso(row.startTime as TimeParts),
    endAt: toIso(row.endTime as TimeParts),
    capacity: row.capacity,
    confirmedCount: row.confirmedCount,
    pendingCount: row.pendingCount,
  }));

  emit('save', props.date, result);
  close();
}
</script>

<style scoped>
.booked-reference {
  min-height: 40px;
}
</style>
