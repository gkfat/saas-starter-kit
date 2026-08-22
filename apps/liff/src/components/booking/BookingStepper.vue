<script setup lang="ts">
const props = defineProps<{ step: 1 | 2 | 3 }>();

const labels = ['日期時段', '服務人員', '確認預約'];
</script>

<template>
  <div class="booking-progress">
    <span
      v-for="n in 3"
      :key="n"
      class="booking-progress__dot"
      :class="{
        'booking-progress__dot--active': n === props.step,
        'booking-progress__dot--done': n < props.step,
      }"
    />
    <span class="booking-progress__label">{{ labels[props.step - 1] }}</span>
  </div>
</template>

<style scoped>
.booking-progress {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.booking-progress__dot {
  height: 6px;
  width: 6px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.18);
  transition:
    width 0.2s ease,
    background-color 0.2s ease;
}

.booking-progress__dot--done {
  background: rgba(var(--v-theme-primary), 0.5);
}

.booking-progress__dot--active {
  width: 18px;
  background: rgb(var(--v-theme-primary));
}

.booking-progress__label {
  margin-left: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
