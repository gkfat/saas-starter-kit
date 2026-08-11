<template>
  <VueDatePicker
    v-model="modelValue"
    time-picker
    :disabled="disabled"
    :clearable="false"
    :teleport="true"
    auto-apply
  />
</template>

<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker';

defineProps<{
  disabled?: boolean;
}>();

const modelValue = defineModel<{ hours: number; minutes: number } | null>({ default: null });
</script>
