<template>
  <div>
    <LayoutPageHeader :title="$t('logs.auditTitle')" />

    <FilterBar
      v-model="formData"
      :config="filterConfig"
      class="mb-4"
      @search="applySearch"
      @reset="resetSearch"
    />

    <CardsAppCard>
      <v-data-table
        :headers="headers"
        :items="logs ?? []"
        :loading="pending"
        item-value="requestId"
        class="table-header-nowrap"
      >
        <template #[`item.timestamp`]="{ item }">
          <span class="text-caption font-mono">{{ formatDateTime(item.timestamp) }}</span>
        </template>
        <template #[`item.role`]="{ item }">
          {{ item.actor?.role ? $t(`role.${item.actor.role}`) : '-' }}
        </template>
        <template #[`item.actor`]="{ item }">
          {{ item.actor?.username ?? item.actor?.userId ?? '-' }}
        </template>
        <template #[`item.action`]="{ item }">
          {{ actionLabel(item.action) }}
        </template>
        <template #[`item.actions`]="{ item }">
          <ButtonsIconActionBtn icon="mdi-information-outline" @click="openDetail(item)" />
        </template>
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('logs.auditNoData') }}</span>
        </template>
      </v-data-table>
    </CardsAppCard>

    <LogsAuditLogDetailDialog v-model="detailDialog" :log="detailTarget" />
  </div>
</template>

<script setup lang="ts">
import type { AuditLog } from '@saas-starter-kit/shared';
import {
  createDateTimeRangeField,
  createSelectField,
  createTextInputField,
  type FilterBarConfig,
  type FormData,
} from '~/components/filter-bar/types';

const { t } = useI18n();
const { actionLabel } = useAuditActionLabel();

const headers = computed(() => [
  { title: t('logs.time'), key: 'timestamp' },
  { title: t('logs.role'), key: 'role', sortable: false },
  { title: t('logs.actor'), key: 'actor', sortable: false },
  { title: t('logs.action'), key: 'action' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]);

const appliedFilters = ref<{
  actor?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}>({});

const queryParams = computed(() => ({ ...appliedFilters.value }));

const {
  data: logs,
  pending,
  refresh,
} = useAuthFetch<AuditLog[]>('/api/admin/logs/audit', {
  query: queryParams,
  default: (): AuditLog[] => [],
});

const filterConfig = computed<FilterBarConfig>(() => ({
  fields: [
    createDateTimeRangeField({
      key: 'range',
      label: t('logs.dateRange'),
      icon: 'mdi-calendar-range',
    }),
    createTextInputField({
      key: 'actor',
      label: t('logs.actor'),
      icon: 'mdi-magnify',
    }),
    createSelectField({
      key: 'action',
      label: t('logs.action'),
      icon: 'mdi-chevron-down',
      options: AUDIT_LOG_ACTIONS.map((action) => ({ text: actionLabel(action), value: action })),
    }),
  ],
}));
const formData = ref<FormData>({});

function applySearch(data: FormData) {
  const range = Array.isArray(data.range) ? (data.range as [string, string]) : null;

  appliedFilters.value = {
    actor: typeof data.actor === 'string' && data.actor ? data.actor : undefined,
    action: typeof data.action === 'string' && data.action ? data.action : undefined,
    startDate: range?.[0],
    endDate: range?.[1],
  };
  refresh();
}

function resetSearch() {
  appliedFilters.value = {};
  refresh();
}

const detailDialog = ref(false);
const detailTarget = ref<AuditLog | null>(null);

function openDetail(item: AuditLog) {
  detailTarget.value = item;
  detailDialog.value = true;
}
</script>
