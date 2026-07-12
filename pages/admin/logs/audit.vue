<template>
  <div>
    <div class="text-h5 mb-6">Audit Logs</div>
    <v-card elevation="2">
      <v-data-table
        :headers="headers"
        :items="logs ?? []"
        :loading="pending"
        item-value="requestId"
      >
        <template #[`item.actor`]="{ item }">
          {{ item.actor?.userId ?? '—' }}
        </template>
        <template #[`item.diff`]="{ item }">
          <span v-if="item.diff" class="text-medium-emphasis text-caption">
            {{ Object.keys(item.diff).join(', ') }}
          </span>
          <span v-else class="text-disabled">—</span>
        </template>
        <template #no-data>
          <span class="text-medium-emphasis">No audit logs yet</span>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { AuditLog } from '~/server/modules/logs';

const headers = [
  { title: 'Time', key: 'timestamp' },
  { title: 'Actor', key: 'actor', sortable: false },
  { title: 'Action', key: 'action' },
  { title: 'Resource', key: 'resourceId' },
  { title: 'Changed Fields', key: 'diff', sortable: false },
];

const { data: logs, pending } = await useAuthFetch<AuditLog[]>('/api/admin/logs/audit', {
  default: (): AuditLog[] => [],
});
</script>
