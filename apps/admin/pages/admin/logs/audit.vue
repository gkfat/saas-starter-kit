<template>
  <div>
    <LayoutPageHeader :title="$t('logs.auditTitle')" />
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
        <template #[`item.actor`]="{ item }">
          {{ item.actor?.username ?? item.actor?.userId ?? '-' }}
        </template>
        <template #[`item.resourceId`]="{ item }">
          {{ item.resourceId ?? '-' }}
        </template>
        <template #[`item.diff`]="{ item }">
          <span v-if="item.diff" class="text-medium-emphasis text-caption">
            {{ Object.keys(item.diff).join(', ') }}
          </span>
          <span v-else class="text-disabled">-</span>
        </template>
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('logs.auditNoData') }}</span>
        </template>
      </v-data-table>
    </CardsAppCard>
  </div>
</template>

<script setup lang="ts">
import type { AuditLog } from '@saas-starter-kit/shared';

const { t } = useI18n();

const headers = computed(() => [
  { title: t('logs.time'), key: 'timestamp' },
  { title: t('logs.actor'), key: 'actor', sortable: false },
  { title: t('logs.action'), key: 'action' },
  { title: t('logs.resource'), key: 'resourceId' },
  { title: t('logs.changedFields'), key: 'diff', sortable: false },
]);

const { data: logs, pending } = await useAuthFetch<AuditLog[]>('/api/admin/logs/audit', {
  default: (): AuditLog[] => [],
});
</script>
