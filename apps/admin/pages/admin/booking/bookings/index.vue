<template>
  <div>
    <div class="d-flex flex-wrap ga-3 align-center justify-space-between">
      <LayoutPageHeader :title="$t('bookings.title')" />
    </div>

    <BookingsFilterBar :services="services ?? []" @apply="applyFilters" />

    <CardsAppCard>
      <v-data-table-server
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        class="bookings-table"
        :headers="headers"
        :items="bookings"
        :items-length="total"
        :loading="pending"
        item-value="id"
      >
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('bookings.noData') }}</span>
        </template>

        <template #[`item.memberNo`]="{ item }">
          <span class="text-caption font-mono">{{ item.memberNo }}</span>
        </template>

        <template #[`item.timeSlotDate`]="{ item }">
          {{ item.timeSlotStartAt ? formatDate(item.timeSlotStartAt) : '—' }}
        </template>

        <template #[`item.timeSlotRange`]="{ item }">
          {{
            item.timeSlotStartAt ? formatTimeRange(item.timeSlotStartAt, item.timeSlotEndAt) : '—'
          }}
        </template>

        <template #[`item.providerName`]="{ item }">
          {{ item.providerName ?? '—' }}
        </template>

        <template #[`item.note`]="{ item }">
          <span class="text-caption">{{ item.note ?? '—' }}</span>
        </template>

        <template #[`item.status`]="{ item }">
          <v-chip :color="statusColor(item.status)" size="small" variant="flat">
            {{ $t(`bookings.statusOption.${item.status}`) }}
          </v-chip>
        </template>

        <template #[`item.createdAt`]="{ item }">
          {{ formatDateTime(item.createdAt) }}
        </template>

        <template #[`item.actions`]="{ item }">
          <v-row
            v-if="canReview && item.status === 'pendingReview'"
            no-gutters
            class="ga-1 flex-nowrap"
          >
            <ButtonsAppButton kind="primary" size="small" @click="openApprove(item)">
              {{ $t('bookings.approve') }}
            </ButtonsAppButton>
            <ButtonsAppButton kind="secondary" size="small" @click="openReject(item)">
              {{ $t('bookings.reject') }}
            </ButtonsAppButton>
          </v-row>
        </template>
      </v-data-table-server>
    </CardsAppCard>

    <v-dialog v-model="approveDialog" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('bookings.approveConfirmTitle') }}</v-card-title>
        <v-card-text>{{ $t('bookings.approveConfirm') }}</v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton kind="secondary" :disabled="reviewing" @click="approveDialog = false">
            {{ $t('common.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton kind="primary" :loading="reviewing" @click="confirmReview('confirmed')">
            {{ $t('common.confirm') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>

    <v-dialog v-model="rejectDialog" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('bookings.rejectConfirmTitle') }}</v-card-title>
        <v-card-text>{{ $t('bookings.rejectConfirm') }}</v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton kind="secondary" :disabled="reviewing" @click="rejectDialog = false">
            {{ $t('common.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton
            kind="primary"
            color="error"
            :loading="reviewing"
            @click="confirmReview('rejected')"
          >
            {{ $t('common.confirm') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { Permission } from '@saas-starter-kit/shared';
import type {
  AdminBookingRow,
  BookingService,
  BookingStatus,
  PaginatedAdminBookingsResponse,
} from '@saas-starter-kit/shared';
import BookingsFilterBar from '~/components/booking/BookingsFilterBar.vue';
import { useTimezoneStore } from '~/stores/timezone';
import dayjs from '~/utils/dayjs';

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();
const { hasPermission } = usePermission();
const timezoneStore = useTimezoneStore();

const canReview = computed(() => hasPermission(Permission.Bookings.Review));

const { data: services } = useAuthFetch<BookingService[]>('/api/admin/booking/services', {
  default: () => [],
});

function formatTimeRange(startAt: string, endAt: string): string {
  const format = (value: string) => dayjs(value).tz(timezoneStore.selected).format('HH:mm');
  return `${format(startAt)} - ${format(endAt)}`;
}

const filters = ref<{ serviceId: string; status: BookingStatus | ''; memberId: string }>({
  serviceId: '',
  status: '',
  memberId: '',
});

const page = ref(1);
const itemsPerPage = ref(20);

function applyFilters(value: { serviceId: string; status: BookingStatus | ''; memberId: string }) {
  filters.value = value;
  page.value = 1;
}

const { data, pending, refresh } = useAuthFetch<PaginatedAdminBookingsResponse>(
  '/api/admin/booking/bookings',
  {
    default: () => ({ items: [], total: 0 }),
    query: computed(() => ({
      ...(filters.value.serviceId ? { serviceId: filters.value.serviceId } : {}),
      ...(filters.value.status ? { status: filters.value.status } : {}),
      ...(filters.value.memberId ? { memberId: filters.value.memberId } : {}),
      page: page.value,
      pageSize: itemsPerPage.value,
    })),
  },
);

const bookings = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.total ?? 0);

watch(itemsPerPage, () => {
  page.value = 1;
});

const headers = computed(() => [
  { title: t('bookings.memberNo'), key: 'memberNo', sortable: false },
  { title: t('bookings.memberName'), key: 'memberDisplayName', sortable: false },
  { title: t('bookings.service'), key: 'serviceName', sortable: false },
  { title: t('bookings.provider'), key: 'providerName', sortable: false },
  { title: t('bookings.date'), key: 'timeSlotDate', sortable: false },
  { title: t('bookings.timeSlot'), key: 'timeSlotRange', sortable: false },
  { title: t('bookings.note'), key: 'note', sortable: false },
  { title: t('bookings.createdAt'), key: 'createdAt', sortable: false },
  { title: t('bookings.status'), key: 'status', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]);

function statusColor(status: BookingStatus): string {
  if (status === 'confirmed') return 'success';
  if (status === 'pendingReview') return 'warning';
  return 'error';
}

const approveDialog = ref(false);
const rejectDialog = ref(false);
const reviewing = ref(false);
const reviewTarget = ref<AdminBookingRow | null>(null);

function openApprove(item: AdminBookingRow) {
  reviewTarget.value = item;
  approveDialog.value = true;
}

function openReject(item: AdminBookingRow) {
  reviewTarget.value = item;
  rejectDialog.value = true;
}

async function confirmReview(status: 'confirmed' | 'rejected') {
  if (!reviewTarget.value) return;
  reviewing.value = true;
  const result = await apiFetch(`/api/admin/booking/bookings/${reviewTarget.value.id}`, {
    method: 'PATCH',
    body: { status },
  });
  if (result !== null) {
    approveDialog.value = false;
    rejectDialog.value = false;
    showSuccess(
      status === 'confirmed' ? t('bookings.approveSuccess') : t('bookings.rejectSuccess'),
    );
    await refresh();
  }
  reviewing.value = false;
}
</script>

<style scoped>
.bookings-table :deep(th),
.bookings-table :deep(td) {
  white-space: nowrap;
}
</style>
