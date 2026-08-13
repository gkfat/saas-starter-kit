<template>
  <VueDatePicker
    :model-value="modelValue"
    range
    multi-calendars
    inline
    auto-apply
    :time-config="{
      timePickerInline: true,
    }"
    :formats="{
      input: 'yyyy/MM/dd HH:mm',
    }"
    :disabled="disabled"
    @update:model-value="handleUpdate"
  />
</template>

<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker';

defineProps<{ disabled?: boolean }>();
const modelValue = defineModel<[Date, Date] | null>({ default: null });

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function handleUpdate(value: (Date | null)[] | null) {
  if (!value || !value[0] || !value[1]) {
    modelValue.value = null;
    return;
  }

  const [prevStart, prevEnd] = modelValue.value ?? [null, null];

  const start = new Date(value[0]);
  if (!prevStart || dateKey(prevStart) !== dateKey(start)) {
    start.setHours(0, 0, 0, 0);
  }

  const end = new Date(value[1]);
  if (!prevEnd || dateKey(prevEnd) !== dateKey(end)) {
    end.setHours(23, 59, 0, 0);
  }

  modelValue.value = [start, end];
}
</script>

<style scoped>
:deep(.dp--instance-calendar) {
  padding-bottom: 10px;
}
</style>
