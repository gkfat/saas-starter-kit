<template>
  <div class="d-flex flex-wrap ga-2">
    <v-chip
      v-for="day in weekdayOptions"
      :key="day.value"
      :color="modelValue.includes(day.value) ? 'primary' : undefined"
      :variant="modelValue.includes(day.value) ? 'flat' : 'outlined'"
      :prepend-icon="modelValue.includes(day.value) ? 'mdi-check' : undefined"
      @click="toggle(day.value)"
    >
      {{ day.label }}
    </v-chip>
  </div>
</template>

<script setup lang="ts">
const modelValue = defineModel<number[]>({ default: () => [] });

const { t } = useI18n();

// Monday-first display order, matching the app's general week-start convention.
const weekdayOptions = computed(() =>
  [1, 2, 3, 4, 5, 6, 0].map((value) => ({
    value,
    label: t(`bookingSlotTemplates.weekdayShort.${value}`),
  })),
);

function toggle(value: number) {
  modelValue.value = modelValue.value.includes(value)
    ? modelValue.value.filter((v) => v !== value)
    : [...modelValue.value, value].sort((a, b) => a - b);
}
</script>
