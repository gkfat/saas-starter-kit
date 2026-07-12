<template>
  <div>
    <div class="text-h5 mb-6">Login Logs</div>
    <v-card elevation="2">
      <v-data-table
        :headers="headers"
        :items="logs ?? []"
        :loading="pending"
        item-value="requestId"
      >
        <template #[`item.result`]="{ item }">
          <v-chip
            :color="item.result === 'success' ? 'success' : 'error'"
            size="small"
            variant="tonal"
          >
            {{ item.result }}
          </v-chip>
        </template>
        <template #no-data>
          <span class="text-medium-emphasis">No login logs found</span>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { LoginLog } from '~/server/modules/logs';

const headers = [
  { title: 'Time', key: 'timestamp' },
  { title: 'Email', key: 'email' },
  { title: 'Provider', key: 'provider' },
  { title: 'IP', key: 'ip' },
  { title: 'Result', key: 'result' },
];

const { data: logs, pending } = await useAuthFetch<LoginLog[]>('/api/admin/logs/login', {
  default: (): LoginLog[] => [],
});
</script>
