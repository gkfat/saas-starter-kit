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
import type { BookingService, BookingStatus } from '@saas-starter-kit/shared';
import {
  createSelectField,
  createTextInputField,
  type FilterBarConfig,
  type FormData,
} from '~/components/filter-bar/types';

const props = defineProps<{
  services: BookingService[];
}>();

const emit = defineEmits<{
  apply: [{ serviceId: string; status: BookingStatus | ''; memberId: string }];
}>();

const { t } = useI18n();

const statusOptions: BookingStatus[] = ['pendingReview', 'confirmed', 'rejected', 'cancelled'];

const config = computed<FilterBarConfig>(() => ({
  fields: [
    createSelectField({
      key: 'serviceId',
      label: t('bookings.filterByService'),
      icon: 'mdi-chevron-down',
      options: props.services.map((service) => ({ text: service.name, value: service.id })),
    }),
    createSelectField({
      key: 'status',
      label: t('bookings.filterByStatus'),
      icon: 'mdi-chevron-down',
      options: statusOptions.map((value): { text: string; value: string | number } => ({
        text: t(`bookings.statusOption.${value}`),
        value,
      })),
    }),
    createTextInputField({
      key: 'memberId',
      label: t('bookings.searchByMemberId'),
      icon: 'mdi-magnify',
    }),
  ],
}));

const formData = ref<FormData>({});

function handleSearch(data: FormData) {
  emit('apply', {
    serviceId: typeof data.serviceId === 'string' ? data.serviceId : '',
    status: typeof data.status === 'string' ? (data.status as BookingStatus) : '',
    memberId: typeof data.memberId === 'string' ? data.memberId : '',
  });
}

function handleReset() {
  emit('apply', { serviceId: '', status: '', memberId: '' });
}
</script>
