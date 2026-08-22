<template>
  <div>
    <div class="d-flex flex-wrap ga-3 align-center justify-space-between">
      <LayoutPageHeader :title="$t('bookingSlotTemplates.title')" />
      <ButtonsAppButton v-if="canWrite" kind="primary" prepend-icon="mdi-plus" @click="openCreate">
        {{ $t('bookingSlotTemplates.create') }}
      </ButtonsAppButton>
    </div>

    <CardsAppCard>
      <v-data-table :headers="headers" :items="templates ?? []" :loading="pending" item-value="id">
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('bookingSlotTemplates.noData') }}</span>
        </template>

        <template #[`item.weekdays`]="{ item }">
          {{ formatWeekdays(item.weekdays) }}
        </template>

        <template #[`item.hours`]="{ item }">
          {{ item.dailyStartTime }} – {{ item.dailyEndTime }}
        </template>

        <template #[`item.granularityMinutes`]="{ item }">
          {{ $t(`bookingSlotTemplates.granularityOption.${item.granularityMinutes}`) }}
        </template>

        <template #[`item.actions`]="{ item }">
          <v-row no-gutters class="ga-1 flex-nowrap justify-end">
            <ButtonsIconActionBtn v-if="canWrite" icon="mdi-pencil" @click="openEdit(item)" />
            <ButtonsIconActionBtn
              v-if="canWrite"
              icon="mdi-delete-outline"
              class="text-error"
              @click="openDelete(item)"
            />
          </v-row>
        </template>
      </v-data-table>
    </CardsAppCard>

    <BookingSlotTemplateFormDialog v-model="formDialog" :template="editing" @saved="refresh" />

    <v-dialog v-model="deleteDialog" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{
          $t('bookingSlotTemplates.deleteConfirmTitle')
        }}</v-card-title>
        <v-card-text>
          {{ $t('bookingSlotTemplates.deleteConfirm', { name: deleteTarget?.name }) }}
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton kind="secondary" :disabled="deleting" @click="deleteDialog = false">
            {{ $t('common.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton kind="primary" color="error" :loading="deleting" @click="confirmDelete">
            {{ $t('common.confirm') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { Permission } from '@saas-starter-kit/shared';
import type { BookingSlotTemplate, OkResponse } from '@saas-starter-kit/shared';
import BookingSlotTemplateFormDialog from '~/components/booking/BookingSlotTemplateFormDialog.vue';

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();
const { hasPermission } = usePermission();

const canWrite = computed(() => hasPermission(Permission.Bookings.Write));

const {
  data: templates,
  pending,
  refresh,
} = useAuthFetch<BookingSlotTemplate[]>('/api/admin/booking/slot-templates', { default: () => [] });

const headers = computed(() => [
  { title: t('bookingSlotTemplates.name'), key: 'name' },
  { title: t('bookingSlotTemplates.businessDays'), key: 'weekdays', sortable: false },
  { title: t('bookingSlotTemplates.hours'), key: 'hours', sortable: false },
  { title: t('bookingSlotTemplates.granularity'), key: 'granularityMinutes' },
  { title: t('bookingSlotTemplates.defaultCapacity'), key: 'defaultCapacity' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]);

function formatWeekdays(weekdays: number[] | undefined): string {
  if (!Array.isArray(weekdays)) return '—';
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((value) => weekdays.includes(value))
    .map((value) => t(`bookingSlotTemplates.weekdayShort.${value}`))
    .join('、');
}

const formDialog = ref(false);
const editing = ref<BookingSlotTemplate | null>(null);

function openCreate() {
  editing.value = null;
  formDialog.value = true;
}

function openEdit(item: BookingSlotTemplate) {
  editing.value = item;
  formDialog.value = true;
}

const deleteDialog = ref(false);
const deleting = ref(false);
const deleteTarget = ref<BookingSlotTemplate | null>(null);

function openDelete(item: BookingSlotTemplate) {
  deleteTarget.value = item;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  const result = await apiFetch<OkResponse>(
    `/api/admin/booking/slot-templates/${deleteTarget.value.id}`,
    { method: 'DELETE' },
  );
  if (result !== null) {
    deleteDialog.value = false;
    showSuccess(t('bookingSlotTemplates.deleteSuccess'));
    await refresh();
  }
  deleting.value = false;
}
</script>
