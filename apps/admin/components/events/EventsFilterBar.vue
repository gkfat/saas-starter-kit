<template>
  <FilterBar
    v-model="formData"
    :config="config"
    class="mb-4"
    @search="handleSearch"
    @reset="handleReset"
  />
</template>

<script setup lang="ts">
import type { EventStatus } from '@saas-starter-kit/shared';
import {
  createSelectField,
  createTextInputField,
  type FilterBarConfig,
  type FormData,
} from '~/components/filter-bar/types';

const emit = defineEmits<{
  apply: [{ search: string; status: EventStatus | '' }];
}>();

const { t } = useI18n();

const statusOptions: EventStatus[] = ['upcoming', 'active', 'ended', 'disabled'];

const config = computed<FilterBarConfig>(() => ({
  fields: [
    createTextInputField({
      key: 'search',
      label: t('events.searchByTitle'),
      icon: 'mdi-magnify',
    }),
    createSelectField({
      key: 'status',
      label: t('events.status'),
      icon: 'mdi-chevron-down',
      options: statusOptions.map((value): { text: string; value: string | number } => ({
        text: t(`events.statusOption.${value}`),
        value,
      })),
    }),
  ],
}));

const formData = ref<FormData>({});

function handleSearch(data: FormData) {
  emit('apply', {
    search: typeof data.search === 'string' ? data.search : '',
    status: typeof data.status === 'string' ? (data.status as EventStatus) : '',
  });
}

function handleReset() {
  emit('apply', { search: '', status: '' });
}
</script>
