<template>
  <VueDatePicker
    v-model="modelValue"
    :time-config="{
      enableTimePicker: false,
    }"
    :disabled="disabled"
    :clearable="false"
    :teleport="true"
    :formats="{
      input: 'yyyy/MM/dd',
    }"
    auto-apply
  />
</template>

<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker';

defineProps<{
  disabled?: boolean;
}>();

const modelValue = defineModel<Date | null>({ default: null });
</script>
