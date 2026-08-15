<template>
  <div>
    <div class="d-flex flex-wrap ga-3 align-center justify-space-between">
      <LayoutPageHeader :title="$t('events.title')" />
      <EventsToolbar :can-create="canCreate" @create="openCreate" />
    </div>

    <EventsFilterBar @apply="applyFilters" />

    <CardsAppCard>
      <v-data-table :headers="headers" :items="filteredEvents" :loading="pending" item-value="id">
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('events.noData') }}</span>
        </template>

        <template #[`item.id`]="{ item }">
          <span class="text-caption font-mono text-no-wrap text-medium-emphasis">{{
            item.id
          }}</span>
        </template>

        <template #[`item.status`]="{ item }">
          <v-chip :color="statusColor(item.status)" size="small" variant="flat">
            {{ $t(`events.statusOption.${item.status}`) }}
          </v-chip>
        </template>

        <template #[`item.startAt`]="{ item }">
          {{ formatDateTime(item.startAt) }}
        </template>

        <template #[`item.endAt`]="{ item }">
          {{ formatDateTime(item.endAt) }}
        </template>

        <template #[`item.actions`]="{ item }">
          <v-row no-gutters class="ga-1 flex-nowrap">
            <ButtonsIconActionBtn v-if="canWrite" icon="mdi-pencil" @click="openEdit(item)" />
            <ButtonsIconActionBtn
              v-if="canDelete"
              icon="mdi-delete-outline"
              class="text-error"
              @click="openDelete(item)"
            />
          </v-row>
        </template>
      </v-data-table>
    </CardsAppCard>

    <EventFormDialog v-model="formDialog" :event="editing" @saved="refresh" />

    <v-dialog v-model="deleteDialog" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('events.deleteConfirmTitle') }}</v-card-title>
        <v-card-text>
          {{ $t('events.deleteConfirm', { title: deleteTarget?.title }) }}
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
import type { EventStatus, EventWithStatus, OkResponse } from '@saas-starter-kit/shared';
import EventFormDialog from '~/components/events/EventFormDialog.vue';
import EventsFilterBar from '~/components/events/EventsFilterBar.vue';
import EventsToolbar from '~/components/events/EventsToolbar.vue';

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();
const { hasPermission } = usePermission();

const canWrite = computed(() => hasPermission(Permission.Events.Write));
const canCreate = computed(() => hasPermission(Permission.Events.Create));
const canDelete = computed(() => hasPermission(Permission.Events.Delete));

const {
  data: events,
  pending,
  refresh,
} = useAuthFetch<EventWithStatus[]>('/api/admin/events', { default: () => [] });

const appliedSearch = ref('');
const appliedStatus = ref<EventStatus | ''>('');

function applyFilters({ search, status }: { search: string; status: EventStatus | '' }) {
  appliedSearch.value = search;
  appliedStatus.value = status;
}

const filteredEvents = computed(() => {
  const search = appliedSearch.value.trim().toLowerCase();
  return (events.value ?? []).filter((item) => {
    if (search && !item.title.toLowerCase().includes(search)) return false;
    if (appliedStatus.value && item.status !== appliedStatus.value) return false;
    return true;
  });
});

const headers = computed(() => [
  { title: t('users.uid'), key: 'id' },
  { title: t('events.eventTitle'), key: 'title' },
  { title: t('events.startAt'), key: 'startAt' },
  { title: t('events.endAt'), key: 'endAt' },
  { title: t('events.status'), key: 'status' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]);

function statusColor(status: EventWithStatus['status']): string {
  if (status === 'active') return 'success';
  if (status === 'disabled' || status === 'ended') return 'error';
  return 'warning';
}

const formDialog = ref(false);
const editing = ref<EventWithStatus | null>(null);

function openCreate() {
  editing.value = null;
  formDialog.value = true;
}

function openEdit(item: EventWithStatus) {
  editing.value = item;
  formDialog.value = true;
}

const deleteDialog = ref(false);
const deleteTarget = ref<EventWithStatus | null>(null);
const deleting = ref(false);

function openDelete(item: EventWithStatus) {
  deleteTarget.value = item;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  const result = await apiFetch<OkResponse>(`/api/admin/events/${deleteTarget.value.id}`, {
    method: 'DELETE',
  });
  if (result !== null) {
    deleteDialog.value = false;
    showSuccess(t('events.deleteSuccess'));
    await refresh();
  }
  deleting.value = false;
}
</script>
