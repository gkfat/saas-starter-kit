<template>
  <div>
    <div class="d-flex flex-wrap ga-3 align-center justify-space-between">
      <LayoutPageHeader :title="$t('bookingServices.title')" />
      <ButtonsAppButton v-if="canWrite" kind="primary" prepend-icon="mdi-plus" @click="openCreate">
        {{ $t('bookingServices.create') }}
      </ButtonsAppButton>
    </div>

    <CardsAppCard>
      <v-data-table :headers="headers" :items="services ?? []" :loading="pending" item-value="id">
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('bookingServices.noData') }}</span>
        </template>

        <template #[`item.description`]="{ item }">
          {{ item.description || '—' }}
        </template>

        <template #[`item.approvalMode`]="{ item }">
          {{ $t(`bookingServices.approvalModeOption.${item.approvalMode}`) }}
        </template>

        <template #[`item.enabled`]="{ item }">
          <v-chip :color="item.enabled ? 'success' : 'error'" size="small" variant="flat">
            {{ item.enabled ? $t('bookingServices.enabled') : $t('bookingServices.disabled') }}
          </v-chip>
        </template>

        <template #[`item.actions`]="{ item }">
          <v-row no-gutters class="ga-1 flex-nowrap justify-end">
            <ButtonsIconActionBtn
              icon="mdi-calendar-clock-outline"
              :title="$t('bookingServices.manageSlots')"
              @click="goToSlots(item)"
            />
            <ButtonsIconActionBtn v-if="canWrite" icon="mdi-pencil" @click="openEdit(item)" />
          </v-row>
        </template>
      </v-data-table>
    </CardsAppCard>

    <BookingServiceFormDialog v-model="formDialog" :service="editing" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { Permission } from '@saas-starter-kit/shared';
import type { BookingService } from '@saas-starter-kit/shared';
import BookingServiceFormDialog from '~/components/booking/BookingServiceFormDialog.vue';
import { ROUTES } from '~/config/app-routes';

const { t } = useI18n();
const router = useRouter();
const { hasPermission } = usePermission();

const canWrite = computed(() => hasPermission(Permission.Bookings.Write));

const {
  data: services,
  pending,
  refresh,
} = useAuthFetch<BookingService[]>('/api/admin/booking/services', { default: () => [] });

const headers = computed(() => [
  { title: t('bookingServices.name'), key: 'name' },
  { title: t('bookingServices.description'), key: 'description', sortable: false },
  { title: t('bookingServices.approvalMode'), key: 'approvalMode' },
  { title: t('bookingServices.enabled'), key: 'enabled' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]);

const formDialog = ref(false);
const editing = ref<BookingService | null>(null);

function openCreate() {
  editing.value = null;
  formDialog.value = true;
}

function openEdit(item: BookingService) {
  editing.value = item;
  formDialog.value = true;
}

function goToSlots(item: BookingService) {
  router.push(`${ROUTES.bookingServices}/${item.id}/slots`);
}

async function onSaved(payload: { service: BookingService; applyTemplateId?: string }) {
  if (payload.applyTemplateId) {
    router.push({
      path: `${ROUTES.bookingServices}/${payload.service.id}/slots`,
      query: { applyTemplate: payload.applyTemplateId },
    });
    return;
  }
  await refresh();
}
</script>
