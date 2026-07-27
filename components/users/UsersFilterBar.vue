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
import {
  createTextInputField,
  type FilterBarConfig,
  type FormData,
} from '~/components/filter-bar/types';

const emit = defineEmits<{
  apply: [{ search: string }];
}>();

const { t } = useI18n();

const config = computed<FilterBarConfig>(() => ({
  fields: [
    createTextInputField({
      key: 'search',
      label: t('users.searchByUsernameOrEmail'),
      icon: 'mdi-magnify',
    }),
  ],
}));

const formData = ref<FormData>({});

function handleSearch(data: FormData) {
  emit('apply', { search: typeof data.search === 'string' ? data.search : '' });
}

function handleReset() {
  emit('apply', { search: '' });
}
</script>
