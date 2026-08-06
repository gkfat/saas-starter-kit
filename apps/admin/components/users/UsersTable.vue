<template>
  <CardsAppCard>
    <v-data-table
      :headers="headers"
      :items="users"
      :loading="pending"
      item-value="userId"
      class="users-table table-header-nowrap"
    >
      <template #no-data>
        <span class="text-medium-emphasis">{{ $t('users.noData') }}</span>
      </template>
      <template #[`item.userId`]="{ item }">
        <span class="text-caption font-mono text-no-wrap text-medium-emphasis">{{
          item.userId
        }}</span>
      </template>
      <template #[`item.memberNo`]="{ item }">
        <span class="text-caption font-mono">{{ item.memberNo }}</span>
      </template>
      <template #[`item.email`]="{ item }">
        <span>{{ item.email ?? '-' }}</span>
      </template>
      <template #[`item.role`]="{ item }">
        <span>{{ item.role ? $t(`role.${item.role}`) : '-' }}</span>
      </template>
      <template #[`item.status`]="{ item }">
        <ButtonsAppButton
          kind="text"
          size="small"
          :color="statusColor(item)"
          class="border text-caption"
          prepend-icon="mdi-cog"
          @click="canWriteUsers && emit('toggle-status', item)"
        >
          {{ statusLabel(item) }}
        </ButtonsAppButton>
      </template>
      <template #[`item.lastLoginAt`]="{ item }">
        <span :title="item.lastLoginAt ? formatDateTime(item.lastLoginAt) : undefined">{{
          formatRelativeTime(item.lastLoginAt, locale)
        }}</span>
      </template>
      <template #[`item.createdAt`]="{ item }">
        <span class="text-no-wrap">{{ formatDateTime(item.createdAt) }}</span>
      </template>
      <template v-if="showLevelColumn" #[`item.level`]="{ item }">
        <span v-if="item.level" class="text-no-wrap">{{ item.level.levelName }}</span>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template #[`item.actions`]="{ item }">
        <v-row no-gutters class="ga-1 flex-nowrap">
          <ButtonsIconActionBtn
            v-if="showMemberFeatures"
            icon="mdi-information-outline"
            @click="emit('detail', item)"
          />
          <ButtonsIconActionBtn
            v-if="canWriteUsers"
            icon="mdi-pencil"
            @click="emit('edit', item)"
          />
          <ButtonsIconActionBtn
            v-if="canWriteUsers && item.passwordSetupPending"
            icon="mdi-link-variant"
            @click="emit('regenerate-link', item)"
          />
          <ButtonsIconActionBtn
            v-if="canWriteUsers && item.passwordSetupPending"
            icon="mdi-cellphone-key"
            @click="emit('generate-line-invite', item)"
          />
          <ButtonsIconActionBtn
            v-if="canDeleteUsers && item.disabled"
            icon="mdi-delete-outline"
            class="text-error"
            @click="emit('delete', item)"
          />
        </v-row>
      </template>
    </v-data-table>
  </CardsAppCard>
</template>

<script setup lang="ts">
import { FeatureFlag } from '@saas-starter-kit/shared';
import type { UserRow } from '@saas-starter-kit/shared';

const props = withDefaults(
  defineProps<{
    users: UserRow[];
    pending: boolean;
    canWriteUsers: boolean;
    canDeleteUsers: boolean;
    /** Member-only affordances (level column, detail dialog) — not applicable to admin accounts */
    showMemberFeatures?: boolean;
  }>(),
  { showMemberFeatures: true },
);

const emit = defineEmits<{
  detail: [item: UserRow];
  edit: [item: UserRow];
  'toggle-status': [item: UserRow];
  'regenerate-link': [item: UserRow];
  'generate-line-invite': [item: UserRow];
  delete: [item: UserRow];
}>();

const { t, locale } = useI18n();
const { isFeatureEnabled } = useFeatureFlags();
const showLevelColumn = props.showMemberFeatures && isFeatureEnabled(FeatureFlag.Level);

const headers = computed(() => [
  { title: t('users.uid'), key: 'userId' },
  { title: t('users.memberNo'), key: 'memberNo' },
  { title: t('auth.username'), key: 'username' },
  { title: t('users.email'), key: 'email' },
  { title: t('users.displayName'), key: 'displayName' },
  { title: t('users.role'), key: 'role' },
  { title: t('users.status.label'), key: 'status', sortable: false },
  ...(showLevelColumn ? [{ title: t('users.level'), key: 'level', sortable: false }] : []),
  { title: t('users.lastLoginAt'), key: 'lastLoginAt' },
  { title: t('users.createdAt'), key: 'createdAt' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
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
.users-table :deep(td:last-child) {
  white-space: nowrap;
}
</style>
