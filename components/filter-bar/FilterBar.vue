<template>
  <v-card class="border">
    <v-card-text class="pa-3" :class="{ 'pb-1': appliedFilters.length > 0 }">
      <v-row dense>
        <template v-for="field in config.fields" :key="field.key">
          <v-col cols="auto">
            <MultiSelectFilterChip
              v-if="field.type === 'multiSelect'"
              v-model="formData[field.key] as (string | number)[]"
              :field="field"
              @update="handleFieldUpdate(field.key, $event)"
            />
            <SelectFilterChip
              v-else-if="field.type === 'select'"
              v-model="formData[field.key] as string | number | null | undefined"
              :field="field"
              @update="handleFieldUpdate(field.key, $event)"
            />
            <TextInputFilterChip
              v-else-if="field.type === 'text'"
              v-model="formData[field.key] as string | undefined"
              :field="field"
              @update="handleFieldUpdate(field.key, $event)"
            />
          </v-col>
        </template>
      </v-row>

      <v-row dense class="justify-end">
        <v-col cols="auto">
          <v-btn variant="flat" class="border" @click="handleReset">{{
            $t('filterBar.reset')
          }}</v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn color="primary" elevation="0" prepend-icon="mdi-magnify" @click="handleSearch">
            {{ $t('common.search') }}
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>

    <template v-if="appliedFilters.length > 0">
      <v-divider>
        <em class="text-caption">{{ $t('filterBar.appliedFilters') }}</em>
      </v-divider>

      <v-card-text class="pa-3 pt-0">
        <AppliedFiltersBar :filters="appliedFilters" @remove="removeFilter" />
      </v-card-text>
    </template>
  </v-card>
</template>

<script setup lang="ts">
import MultiSelectFilterChip from './fields/MultiSelectFilterChip.vue';
import SelectFilterChip from './fields/SelectFilterChip.vue';
import TextInputFilterChip from './fields/TextInputFilterChip.vue';
import AppliedFiltersBar from './AppliedFiltersBar.vue';
import {
  isTextInputField,
  isMultiSelectField,
  isSelectField,
  type FilterBarConfig,
  type FilterField,
  type AppliedFilter,
  type FormData,
  type FieldValue,
} from '~/components/filter-bar/types';

const props = defineProps<{ config: FilterBarConfig }>();
const emit = defineEmits<{ search: [formData: FormData]; reset: [] }>();

const { t } = useI18n();

const modelValue = defineModel<FormData>('modelValue', { default: () => ({}) });

const formData = computed<FormData>({
  get: () => {
    const mv = modelValue.value;
    if (!mv || Object.keys(mv).length === 0) return getDefaultFormData();
    return mv;
  },
  set: (newValue: FormData) => {
    modelValue.value = { ...newValue };
  },
});

function getDefaultFormData(): FormData {
  const defaultData: FormData = {};
  props.config.fields.forEach((field: FilterField) => {
    defaultData[field.key] = field.defaultValue as FieldValue;
  });
  return defaultData;
}

function handleFieldUpdate(key: string, value: FieldValue) {
  formData.value = { ...formData.value, [key]: value };
}

const appliedFilters = computed<AppliedFilter[]>(() => {
  const filters: AppliedFilter[] = [];

  props.config.fields.forEach((field: FilterField) => {
    const value = formData.value[field.key];
    const filterInfo = getFilterDisplayInfo(field, value);

    if (filterInfo) {
      filters.push({
        key: field.key,
        label: field.label,
        value: filterInfo,
        removable: field.removable !== false && !field.required,
      });
    }
  });

  return filters;
});

function getFilterDisplayInfo(field: FilterField, value: FieldValue): string | null {
  if (!value) {
    if (field.required) return t('filterBar.pleaseSet', { label: field.label });
    return null;
  }

  switch (field.type) {
    case 'multiSelect':
      if (Array.isArray(value) && value.length > 0) {
        if (value.length === 1) {
          const option = field.options.find((opt) => opt.value === value[0]);
          return option?.text ?? String(value[0]);
        }
        return t('filterBar.selectedCount', { count: value.length });
      }
      break;
    case 'select':
      if (value !== null && value !== undefined && value !== '') {
        const option = field.options.find((opt) => opt.value === value);
        return option?.text ?? String(value);
      }
      break;
    case 'text':
      if (typeof value === 'string' && value.trim()) return value;
      break;
  }

  return null;
}

function removeFilter(key: string) {
  const field = props.config.fields.find((f: FilterField) => f.key === key);
  if (!field || field.required) return;

  if (isTextInputField(field)) {
    handleFieldUpdate(key, field.defaultValue ?? '');
  } else if (isMultiSelectField(field)) {
    handleFieldUpdate(key, (field.defaultValue ?? []) as FieldValue);
  } else if (isSelectField(field)) {
    handleFieldUpdate(key, field.defaultValue ?? null);
  }
}

function handleSearch() {
  emit('search', transformFormData(formData.value));
}

function handleReset() {
  formData.value = getDefaultFormData();
  emit('reset');
}

function transformFormData(data: FormData): FormData {
  const result: FormData = {};

  props.config.fields.forEach((field: FilterField) => {
    const value = data[field.key];
    if (value === undefined || value === null || value === '') return;

    result[field.apiKey || field.key] = field.transform
      ? (field.transform as (v: FieldValue) => FieldValue)(value)
      : value;
  });

  return result;
}

defineExpose({
  reset: handleReset,
  search: handleSearch,
  getFormData: () => formData.value,
});
</script>

<style scoped lang="scss">
:deep(.v-menu__content) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
}

:deep(.v-card) {
  border-radius: 8px;
}
</style>
