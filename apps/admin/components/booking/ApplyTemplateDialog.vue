<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ $t('bookingTimeSlots.applyTemplate') }}</v-card-title>
      <v-card-text>
        <v-row no-gutters class="ga-3 flex-column">
          <v-col>
            <v-select
              v-model="selectedTemplateId"
              :label="$t('bookingTimeSlots.selectTemplate')"
              :items="templateOptions"
              item-title="text"
              item-value="value"
              hide-details="auto"
            />
          </v-col>

          <template v-if="selectedTemplate">
            <v-col>
              <v-text-field
                v-model.number="capacity"
                :label="$t('bookingTimeSlots.applyCapacity')"
                type="number"
                min="1"
                hide-details="auto"
              />
            </v-col>
            <v-col>
              <v-alert type="info" variant="tonal" density="compact">
                {{
                  $t('bookingTimeSlots.applyPreview', {
                    days: matchedDates.length,
                    start: selectedTemplate.dailyStartTime,
                    end: selectedTemplate.dailyEndTime,
                    count: previewCount,
                  })
                }}
              </v-alert>
            </v-col>
          </template>
          <v-col v-else-if="templates.length === 0">
            <span class="text-caption text-medium-emphasis">
              {{ $t('bookingTimeSlots.noTemplates') }}
            </span>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" @click="close">
          {{ $t('common.cancel') }}
        </ButtonsAppButton>
        <ButtonsAppButton kind="primary" :disabled="!selectedTemplate" @click="apply">
          {{ $t('bookingTimeSlots.applyTemplate') }}
        </ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import type { BookingSlotTemplate } from '@saas-starter-kit/shared';
import { useTimezoneStore } from '~/stores/timezone';
import {
  generateDaySlots,
  generateTimeSlotsForMonth,
  weekdayDatesInMonth,
  type GeneratedTimeSlot,
} from '~/utils/booking-slot-generation';

const props = defineProps<{
  modelValue: boolean;
  templates: BookingSlotTemplate[];
  /** Target month to apply the template to; `month` is 0-indexed (JS `Date` convention). */
  year: number;
  month: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  /** Emits the generated draft, grouped by date (`YYYY-MM-DD`) — not yet persisted. */
  applied: [slotsByDate: Map<string, GeneratedTimeSlot[]>];
}>();

const timezoneStore = useTimezoneStore();

const selectedTemplateId = ref<string | null>(null);
const capacity = ref<number | undefined>(undefined);

const templateOptions = computed(() =>
  props.templates.map((template) => ({ text: template.name, value: template.id })),
);

const selectedTemplate = computed(
  () => props.templates.find((template) => template.id === selectedTemplateId.value) ?? null,
);

watch(selectedTemplate, (template) => {
  if (template) capacity.value = template.defaultCapacity;
});

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    selectedTemplateId.value = props.templates[0]?.id ?? null;
  },
);

const matchedDates = computed(() => {
  if (!selectedTemplate.value) return [];
  return weekdayDatesInMonth(props.year, props.month, selectedTemplate.value.weekdays);
});

const previewCount = computed(() => {
  if (!selectedTemplate.value) return 0;
  return generateTimeSlotsForMonth(
    selectedTemplate.value,
    props.year,
    props.month,
    timezoneStore.selected,
    1,
  ).length;
});

function close() {
  emit('update:modelValue', false);
}

function apply() {
  if (!selectedTemplate.value || !capacity.value) return;
  const template = selectedTemplate.value;

  const slotsByDate = new Map<string, GeneratedTimeSlot[]>();
  for (const date of matchedDates.value) {
    slotsByDate.set(
      date,
      generateDaySlots(
        date,
        template.dailyStartTime,
        template.dailyEndTime,
        template.granularityMinutes,
        timezoneStore.selected,
        capacity.value,
      ),
    );
  }

  emit('applied', slotsByDate);
  close();
}
</script>
