<template>
  <v-menu
    v-model="menuOpen"
    :close-on-content-click="false"
    transition="scale-transition"
    offset-y
    min-width="300"
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
    <v-card class="multi-select-card">
      <div class="select-all-section">
        <v-list-item class="select-all-item" @click="toggleSelectAll(!selectAll)">
          <template #prepend>
            <v-checkbox-btn
              v-model="selectAll"
              :indeterminate="isIndeterminate"
              @click.stop="toggleSelectAll(!selectAll)"
            />
          </template>
          <v-list-item-title class="font-weight-medium">{{
            $t('filterBar.selectAll')
          }}</v-list-item-title>
        </v-list-item>
        <v-divider />
      </div>

      <div class="options-scroll-area">
        <v-list density="compact" class="pa-0">
          <v-list-item
            v-for="option in field.options"
            :key="option.value"
            :disabled="option.disabled"
            @click="toggleOption(option.value)"
          >
            <template #prepend>
              <v-checkbox-btn
                :model-value="tempValue.includes(option.value)"
                :disabled="option.disabled"
                @click.stop="toggleOption(option.value)"
              />
            </template>
            <v-list-item-title>{{ option.text }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </div>

      <div class="actions-section">
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="clearSelection">{{ $t('filterBar.clear') }}</v-btn>
          <v-btn variant="text" color="primary" @click="applyValue">{{
            $t('filterBar.apply')
          }}</v-btn>
        </v-card-actions>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import type { MultiSelectFilterField } from '~/components/filter-bar/types';

type SelectValue = string | number;

const props = defineProps<{ field: MultiSelectFilterField<SelectValue> }>();
const emit = defineEmits<{ update: [value: SelectValue[]] }>();

const modelValue = defineModel<SelectValue[]>('modelValue', { default: () => [] });

const { t } = useI18n();

const menuOpen = ref(false);
const tempValue = ref<SelectValue[]>([]);
const selectAll = ref(false);

const isIndeterminate = computed(() => {
  const enabledOptions = props.field.options.filter((opt) => !opt.disabled);
  return tempValue.value.length > 0 && tempValue.value.length < enabledOptions.length;
});

const hasValue = computed(() => modelValue.value.length > 0);

const displayText = computed(() => {
  const count = modelValue.value.length;
  if (count === 0) return t('filterBar.selectPlaceholder', { label: props.field.label });
  if (count === props.field.options.length)
    return t('filterBar.allSelected', { label: props.field.label });
  if (count === 1) {
    const option = props.field.options.find((opt) => opt.value === modelValue.value[0]);
    if (option) return option.text;
  }
  return t('filterBar.selectedCount', { count });
});

watch(menuOpen, (isOpen) => {
  if (isOpen) tempValue.value = [...modelValue.value];
});

watch(
  tempValue,
  (newValue) => {
    const enabledOptions = props.field.options.filter((opt) => !opt.disabled);
    selectAll.value = newValue.length === enabledOptions.length && enabledOptions.length > 0;
  },
  { deep: true },
);

function toggleSelectAll(selected: boolean) {
  tempValue.value = selected
    ? props.field.options.filter((opt) => !opt.disabled).map((opt) => opt.value)
    : [];
}

function toggleOption(value: SelectValue) {
  const currentIndex = tempValue.value.indexOf(value);
  if (currentIndex === -1) {
    tempValue.value = [...tempValue.value, value];
  } else {
    tempValue.value = tempValue.value.filter((v) => v !== value);
  }
}

function clearSelection() {
  tempValue.value = [];
  selectAll.value = false;
}

function applyValue() {
  const applied = [...tempValue.value];
  modelValue.value = applied;
  emit('update', applied);
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

.multi-select-card {
  display: flex;
  flex-direction: column;
  max-height: 500px;

  .select-all-section {
    flex-shrink: 0;
    background-color: rgba(var(--v-theme-surface), 1);
  }

  .options-scroll-area {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .actions-section {
    flex-shrink: 0;
    background-color: rgba(var(--v-theme-surface), 1);
  }
}

.select-all-item {
  background-color: rgba(var(--v-theme-primary), 0.04);

  :deep(.v-list-item-title) {
    color: rgb(var(--v-theme-primary));
  }
}

:deep(.v-list-item) {
  min-height: 40px;

  .v-list-item-title {
    font-size: 14px;
  }
}
</style>
