<template>
  <div>
    <div class="d-flex flex-wrap ga-3 align-center justify-space-between">
      <LayoutPageHeader :title="$t('bookingProviders.title')" />
      <ButtonsAppButton v-if="canWrite" kind="primary" prepend-icon="mdi-plus" @click="openCreate">
        {{ $t('bookingProviders.create') }}
      </ButtonsAppButton>
    </div>

    <CardsAppCard>
      <v-data-table :headers="headers" :items="providers ?? []" :loading="pending" item-value="id">
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('bookingProviders.noData') }}</span>
        </template>

        <template #[`item.enabled`]="{ item }">
          <v-chip :color="item.enabled === false ? 'error' : 'success'" size="small" variant="flat">
            {{
              item.enabled === false
                ? $t('bookingProviders.disabled')
                : $t('bookingProviders.enabled')
            }}
          </v-chip>
        </template>

        <template #[`item.serviceIds`]="{ item }">
          <span v-if="item.serviceIds?.length">{{ formatAssignedServices(item.serviceIds) }}</span>
          <span v-else class="text-medium-emphasis">{{
            $t('bookingProviders.assignedServicesNotSet')
          }}</span>
        </template>

        <template #[`item.workingHours`]="{ item }">
          <span v-if="item.workingHours">{{ formatWorkingHours(item.workingHours) }}</span>
          <span v-else class="text-medium-emphasis">{{
            $t('bookingProviders.workingHoursNotSet')
          }}</span>
        </template>

        <template #[`item.createdAt`]="{ item }">
          {{ new Date(item.createdAt).toLocaleString() }}
        </template>

        <template #[`item.actions`]="{ item }">
          <v-row no-gutters class="ga-1 flex-nowrap justify-end">
            <ButtonsIconActionBtn v-if="canWrite" icon="mdi-pencil" @click="openEdit(item)" />
          </v-row>
        </template>
      </v-data-table>
    </CardsAppCard>

    <BookingProviderFormDialog v-model="formDialog" :provider="editing" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { Permission } from '@saas-starter-kit/shared';
import type {
  BookingProvider,
  BookingProviderWorkingHours,
  BookingService,
} from '@saas-starter-kit/shared';
import BookingProviderFormDialog from '~/components/booking/BookingProviderFormDialog.vue';

const { t } = useI18n();
const { hasPermission } = usePermission();

const canWrite = computed(() => hasPermission(Permission.Bookings.Write));

const {
  data: providers,
  pending,
  refresh,
} = useAuthFetch<BookingProvider[]>('/api/admin/booking/providers', { default: () => [] });

const headers = computed(() => [
  { title: t('bookingProviders.name'), key: 'name' },
  { title: t('bookingProviders.enabled'), key: 'enabled', sortable: false },
  { title: t('bookingProviders.assignedServicesColumn'), key: 'serviceIds', sortable: false },
  { title: t('bookingProviders.workingHoursColumn'), key: 'workingHours', sortable: false },
  { title: t('bookingProviders.createdAt'), key: 'createdAt' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]);

const { data: services } = useAuthFetch<BookingService[]>('/api/admin/booking/services', {
  default: () => [],
});
const serviceNameById = computed(() => new Map((services.value ?? []).map((s) => [s.id, s.name])));

function formatAssignedServices(serviceIds: string[]): string {
  return serviceIds.map((id) => serviceNameById.value.get(id) ?? id).join('、');
}

const formDialog = ref(false);
const editing = ref<BookingProvider | null>(null);

function openCreate() {
  editing.value = null;
  formDialog.value = true;
}

function openEdit(item: BookingProvider) {
  editing.value = item;
  formDialog.value = true;
}

// Monday-first display order, matching WeekdayPicker's chip order.
const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatWorkingHours(workingHours: BookingProviderWorkingHours): string {
  const weekdayLabels = WEEKDAY_DISPLAY_ORDER.filter((day) => workingHours.weekdays.includes(day))
    .map((day) => t(`bookingSlotTemplates.weekdayShort.${day}`))
    .join('、');
  return `${weekdayLabels} ${workingHours.dailyStartTime}-${workingHours.dailyEndTime}`;
}
</script>
