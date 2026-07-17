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
  createSelectField,
  createTextInputField,
  type FilterBarConfig,
  type FormData,
} from '~/components/filter-bar/types';

const props = defineProps<{
  roleOptions: Array<{ title: string; value: string }>;
}>();

const emit = defineEmits<{
  apply: [{ search: string; role: string | null }];
}>();

const { t } = useI18n();

const config = computed<FilterBarConfig>(() => ({
  fields: [
    createTextInputField({
      key: 'search',
      label: t('users.searchByUsernameOrEmail'),
      icon: 'mdi-magnify',
    }),
    createSelectField<string | number>({
      key: 'role',
      label: t('users.filterByRole'),
      icon: 'mdi-account-cog',
      options: props.roleOptions.map((role) => ({ text: role.title, value: role.value })),
    }),
  ],
}));

const formData = ref<FormData>({});

function handleSearch(data: FormData) {
  emit('apply', {
    search: typeof data.search === 'string' ? data.search : '',
    role: typeof data.role === 'string' ? data.role : null,
  });
}

function handleReset() {
  emit('apply', { search: '', role: null });
}
</script>
