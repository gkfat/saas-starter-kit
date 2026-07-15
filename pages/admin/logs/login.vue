<template>
  <div>
    <LayoutBreadcrumb />
    <LayoutPageHeader :title="$t('logs.loginTitle')" />
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
        <template #[`item.timestamp`]="{ item }">
          <span class="text-caption font-mono">{{ formatDateTime(item.timestamp) }}</span>
        </template>
        <template #[`item.username`]="{ item }">
          {{ item.username ?? '-' }}
        </template>
        <template #[`item.email`]="{ item }">
          {{ item.email ?? '-' }}
        </template>
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('logs.noData') }}</span>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { LoginLog } from '~/server/modules/logs';

const { t } = useI18n();

const headers = computed(() => [
  { title: t('logs.time'), key: 'timestamp' },
  { title: t('logs.username'), key: 'username' },
  { title: t('users.email'), key: 'email' },
  { title: t('logs.provider'), key: 'provider' },
  { title: t('logs.ip'), key: 'ip' },
  { title: t('logs.result'), key: 'result' },
]);

const { data: logs, pending } = await useAuthFetch<LoginLog[]>('/api/admin/logs/login', {
  default: (): LoginLog[] => [],
});
</script>
