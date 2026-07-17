<template>
  <v-menu
    v-model="menuOpen"
    :close-on-content-click="false"
    transition="scale-transition"
    offset-y
    min-width="240"
  >
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
    <v-card class="select-card">
      <v-list density="compact" class="pa-0">
        <v-list-item
          v-for="option in field.options"
          :key="option.value"
          :disabled="option.disabled"
          :active="currentValue === option.value"
          @click="selectOption(option.value)"
        >
          <v-list-item-title>{{ option.text }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import type { SelectFilterField } from '~/components/filter-bar/types';

type SelectValue = string | number;

const props = defineProps<{ field: SelectFilterField<SelectValue> }>();
const emit = defineEmits<{ update: [value: SelectValue | null] }>();

const modelValue = defineModel<SelectValue | null | undefined>('modelValue', { default: null });

const currentValue = computed(() => modelValue.value ?? null);

const menuOpen = ref(false);

const hasValue = computed(() => currentValue.value !== null);

const { t } = useI18n();

const displayText = computed(() => {
  if (!hasValue.value) return t('filterBar.selectPlaceholder', { label: props.field.label });
  const option = props.field.options.find((opt) => opt.value === currentValue.value);
  return option?.text ?? String(currentValue.value);
});

function selectOption(value: SelectValue) {
  modelValue.value = value;
  emit('update', value);
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

.select-card {
  max-height: 500px;
  overflow-y: auto;
}

:deep(.v-list-item) {
  min-height: 40px;

  .v-list-item-title {
    font-size: 14px;
  }
}
</style>
