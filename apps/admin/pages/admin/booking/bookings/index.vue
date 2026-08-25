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

        <template #[`item.staffNote`]="{ item }">
          <span class="text-caption">{{ item.staffNote ?? '—' }}</span>
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
          <v-row v-if="canReview" no-gutters class="ga-1 flex-nowrap">
            <template v-if="item.status === 'pendingReview'">
              <ButtonsAppButton kind="primary" size="small" height="32" @click="openApprove(item)">
                {{ $t('bookings.approve') }}
              </ButtonsAppButton>
            </template>
            <template v-if="item.status === 'confirmed' || item.status === 'pendingReview'">
              <ButtonsIconActionBtn
                icon="mdi-calendar-edit"
                :title="$t('bookings.reschedule')"
                @click="openReschedule(item)"
              />
              <ButtonsIconActionBtn
                icon="mdi-close"
                class="text-error"
                :title="$t('bookings.cancel')"
                @click="openCancel(item)"
              />
            </template>
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
          <ButtonsAppButton kind="primary" :loading="reviewing" @click="confirmReview()">
            {{ $t('common.confirm') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>

    <v-dialog v-model="cancelDialog" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('bookings.cancelConfirmTitle') }}</v-card-title>
        <v-card-text>
          <div class="mb-4">{{ $t('bookings.cancelConfirm') }}</div>
          <div class="text-caption text-medium-emphasis mb-1">{{ $t('bookings.staffNote') }}</div>
          <v-textarea
            v-model="cancelNote"
            :placeholder="$t('bookings.staffNotePlaceholder')"
            variant="outlined"
            density="comfortable"
            rows="2"
            maxlength="200"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton kind="secondary" :disabled="cancelling" @click="cancelDialog = false">
            {{ $t('common.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton
            kind="primary"
            color="error"
            :loading="cancelling"
            @click="confirmCancel"
          >
            {{ $t('common.confirm') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>

    <RescheduleBookingDialog
      v-model="rescheduleDialog"
      :booking="rescheduleTarget"
      @rescheduled="refresh"
    />
  </div>
</template>

<script setup lang="ts">
import { AnalyticsEvent, Permission } from '@saas-starter-kit/shared';
import type {
  AdminBookingRow,
  BookingService,
  BookingStatus,
  PaginatedAdminBookingsResponse,
} from '@saas-starter-kit/shared';
import BookingsFilterBar from '~/components/booking/BookingsFilterBar.vue';
import RescheduleBookingDialog from '~/components/booking/RescheduleBookingDialog.vue';
import { useTimezoneStore } from '~/stores/timezone';
import dayjs from '~/utils/dayjs';

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();
const { hasPermission } = usePermission();
const { trackEvent } = useAnalytics();
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
  { title: t('bookings.staffNoteColumn'), key: 'staffNote', sortable: false },
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
const reviewing = ref(false);
const reviewTarget = ref<AdminBookingRow | null>(null);

function openApprove(item: AdminBookingRow) {
  reviewTarget.value = item;
  approveDialog.value = true;
}

async function confirmReview() {
  if (!reviewTarget.value) return;
  reviewing.value = true;
  const result = await apiFetch(`/api/admin/booking/bookings/${reviewTarget.value.id}`, {
    method: 'PATCH',
    body: { status: 'confirmed' },
  });
  if (result !== null) {
    approveDialog.value = false;
    trackEvent(AnalyticsEvent.BookingReviewSubmit, { status: 'confirmed' });
    showSuccess(t('bookings.approveSuccess'));
    await refresh();
  }
  reviewing.value = false;
}

const cancelDialog = ref(false);
const cancelling = ref(false);
const cancelTarget = ref<AdminBookingRow | null>(null);
const cancelNote = ref('');

function openCancel(item: AdminBookingRow) {
  cancelTarget.value = item;
  cancelNote.value = '';
  cancelDialog.value = true;
}

async function confirmCancel() {
  if (!cancelTarget.value) return;
  cancelling.value = true;
  const note = cancelNote.value.trim();
  const result = await apiFetch(`/api/admin/booking/bookings/${cancelTarget.value.id}`, {
    method: 'PATCH',
    body: { status: 'cancelled', ...(note ? { note } : {}) },
  });
  if (result !== null) {
    cancelDialog.value = false;
    trackEvent(AnalyticsEvent.BookingReviewSubmit, { status: 'cancelled' });
    showSuccess(t('bookings.cancelSuccess'));
    await refresh();
  }
  cancelling.value = false;
}

const rescheduleDialog = ref(false);
const rescheduleTarget = ref<AdminBookingRow | null>(null);

function openReschedule(item: AdminBookingRow) {
  rescheduleTarget.value = item;
  rescheduleDialog.value = true;
}
</script>

<style scoped>
.bookings-table :deep(th),
.bookings-table :deep(td) {
  white-space: nowrap;
}
</style>
