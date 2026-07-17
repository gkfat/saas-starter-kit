<template>
  <v-card elevation="2">
    <v-data-table
      :headers="headers"
      :items="users"
      :loading="pending"
      item-value="uid"
      class="users-table"
    >
      <template #no-data>
        <span class="text-medium-emphasis">{{ $t('users.noData') }}</span>
      </template>
      <template #[`item.uid`]="{ item }">
        <span class="text-caption font-mono text-medium-emphasis">{{ item.uid }}</span>
      </template>
      <template #[`item.email`]="{ item }">
        <span>{{ item.email ?? '-' }}</span>
      </template>
      <template #[`item.role`]="{ item }">
        <span>{{ item.role ? $t(`role.${item.role}`) : '-' }}</span>
      </template>
      <template #[`item.status`]="{ item }">
        <v-btn
          size="small"
          :color="statusColor(item)"
          variant="text"
          class="border text-caption"
          prepend-icon="mdi-cog"
          @click="canWriteUsers && emit('toggle-status', item)"
        >
          {{ statusLabel(item) }}
        </v-btn>
      </template>
      <template #[`item.lastLoginAt`]="{ item }">
        <span :title="item.lastLoginAt ? formatDateTime(item.lastLoginAt) : undefined">{{
          formatRelativeTime(item.lastLoginAt, locale)
        }}</span>
      </template>
      <template #[`item.createdAt`]="{ item }">
        <span>{{ formatDateTime(item.createdAt) }}</span>
      </template>
      <template #[`item.actions`]="{ item }">
        <v-row no-gutters class="ga-1 flex-nowrap">
          <v-btn
            v-if="canWriteUsers"
            icon="mdi-pencil"
            size="small"
            variant="flat"
            class="border"
            rounded="lg"
            @click="emit('edit', item)"
          />
          <v-btn
            v-if="canWriteUsers && item.passwordSetupPending"
            icon="mdi-link-variant"
            size="small"
            variant="flat"
            class="border"
            rounded="lg"
            @click="emit('regenerate-link', item)"
          />
          <v-btn
            v-if="canDeleteUsers && item.disabled"
            icon="mdi-delete-outline"
            size="small"
            variant="flat"
            rounded="lg"
            class="border text-error"
            @click="emit('delete', item)"
          />
        </v-row>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
import type { UserRow } from '~/shared/users';

const props = defineProps<{
  users: UserRow[];
  pending: boolean;
  canWriteUsers: boolean;
  canDeleteUsers: boolean;
}>();

const emit = defineEmits<{
  edit: [item: UserRow];
  'toggle-status': [item: UserRow];
  'regenerate-link': [item: UserRow];
  delete: [item: UserRow];
}>();

const { t, locale } = useI18n();

const headers = computed(() => [
  { title: t('users.uid'), key: 'uid' },
  { title: t('auth.username'), key: 'username' },
  { title: t('users.email'), key: 'email' },
  { title: t('users.displayName'), key: 'displayName' },
  { title: t('users.role'), key: 'role' },
  { title: t('users.status.label'), key: 'status', sortable: false },
  { title: t('users.lastLoginAt'), key: 'lastLoginAt' },
  { title: t('users.createdAt'), key: 'createdAt' },
  ...(props.canWriteUsers || props.canDeleteUsers
    ? [{ title: '', key: 'actions', sortable: false, align: 'end' as const }]
    : []),
]);

function statusLabel(item: UserRow): string {
  if (item.disabled) return t('users.status.disabled');
  if (item.passwordSetupPending) return t('users.status.pendingPassword');
  return t('users.status.enabled');
}

function statusColor(item: UserRow): string {
  if (item.disabled) return 'error';
  if (item.passwordSetupPending) return 'warning';
  return 'success';
}
</script>

<style scoped>
.users-table :deep(th) {
  white-space: nowrap;
}

.users-table :deep(td:last-child) {
  white-space: nowrap;
}
</style>
