<template>
  <v-menu v-model="menuOpen" :close-on-content-click="false" transition="scale-transition" offset-y>
    <template #activator="{ props: menuProps }">
      <v-chip
        v-bind="menuProps"
        variant="outlined"
        class="filter-chip"
        :class="{ 'filter-chip--active': hasValue }"
        :prepend-icon="field.icon"
        label
      >
        {{ displayText }}
      </v-chip>
    </template>
    <v-card min-width="240" max-width="95vw">
      <v-card-text class="overflow-x-auto">
        <CommonDateTimeRangePicker v-model="tempValue" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <ButtonsAppButton kind="secondary" @click="cancelValue">{{
          $t('common.cancel')
        }}</ButtonsAppButton>
        <ButtonsAppButton kind="primary" @click="applyValue">{{
          $t('filterBar.apply')
        }}</ButtonsAppButton>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import type { DateTimeRangeFilterField } from '~/components/filter-bar/types';

const props = defineProps<{ field: DateTimeRangeFilterField }>();
const emit = defineEmits<{ update: [value: [string, string] | null] }>();

const modelValue = defineModel<[string, string] | null | undefined>('modelValue');

const menuOpen = ref(false);
const tempValue = ref<[Date, Date] | null>(null);

const hasValue = computed(() => !!modelValue.value);

const displayText = computed(() => {
  if (!hasValue.value || !modelValue.value) return props.field.label;
  const [start, end] = modelValue.value;
  return `${dayjs(start).format('YYYY/MM/DD HH:mm')} ~ ${dayjs(end).format('YYYY/MM/DD HH:mm')}`;
});

watch(menuOpen, (isOpen) => {
  if (!isOpen) return;
  tempValue.value = modelValue.value
    ? [new Date(modelValue.value[0]), new Date(modelValue.value[1])]
    : null;
});

function applyValue() {
  const [start, end] = tempValue.value ?? [null, null];
  const finalValue: [string, string] | null =
    start && end ? [start.toISOString(), end.toISOString()] : null;
  modelValue.value = finalValue;
  emit('update', finalValue);
  menuOpen.value = false;
}

function cancelValue() {
  menuOpen.value = false;
}
</script>

<style scoped lang="scss">
.filter-chip {
  transition: all 0.2s ease;

  &--active {
    background-color: rgba(var(--v-theme-primary), 0.1);
    border-color: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-primary));
  }

  &:hover {
    background-color: rgba(var(--v-theme-on-surface), 0.04);
  }
}
</style>
