<template>
  <div>
    <LayoutBreadcrumb />
    <LayoutPageHeader :title="$t('logs.auditTitle')" />
    <v-card elevation="2">
      <v-data-table
        :headers="headers"
        :items="logs ?? []"
        :loading="pending"
        item-value="requestId"
      >
        <template #[`item.timestamp`]="{ item }">
          <span class="text-caption font-mono">{{ item.timestamp }}</span>
        </template>
        <template #[`item.actor`]="{ item }">
          {{ item.actor?.username ?? item.actor?.userId ?? '—' }}
        </template>
        <template #[`item.diff`]="{ item }">
          <span v-if="item.diff" class="text-medium-emphasis text-caption">
            {{ Object.keys(item.diff).join(', ') }}
          </span>
          <span v-else class="text-disabled">—</span>
        </template>
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('logs.auditNoData') }}</span>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { AuditLog } from '~/server/modules/logs';

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
