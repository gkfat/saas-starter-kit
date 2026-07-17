<template>
  <div>
    <LayoutBreadcrumb />
    <div class="d-flex flex-wrap ga-3 align-center justify-space-between">
      <LayoutPageHeader :title="$t('users.title')" />
      <UsersToolbar :can-create-users="canCreateUsers" @export="exportCsv" @create="openCreate" />
    </div>

    <UsersFilterBar :role-options="roleFilterOptions" @apply="applyFilters" />

    <UsersTable
      :users="users ?? []"
      :pending="pending"
      :can-write-users="canWriteUsers"
      :can-delete-users="canDeleteUsers"
      @edit="openEdit"
      @toggle-status="openToggleStatus"
      @regenerate-link="regenerateLink"
      @delete="openDelete"
    />

    <EditRoleDialog
      v-model="dialog"
      :user="editing"
      :role-options="roleOptions"
      :role-permissions="rolePermissions ?? {}"
      @saved="refresh"
    />

    <CreateUserDialog v-model="createDialog" :role-options="roleOptions" @created="onUserCreated" />

    <SetupLinkDialog v-model="linkDialog" :link="linkDialogValue" />

    <ToggleStatusDialog v-model="statusDialog" :user="statusTarget" @confirmed="refresh" />

    <DeleteUserDialog v-model="deleteDialog" :user="deleteTarget" @confirmed="refresh" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { Permission } from '~/shared/permissions';
import { useAuthStore } from '~/stores/auth';
import CreateUserDialog from './components/CreateUserDialog.vue';
import DeleteUserDialog from './components/DeleteUserDialog.vue';
import EditRoleDialog from './components/EditRoleDialog.vue';
import SetupLinkDialog from './components/SetupLinkDialog.vue';
import ToggleStatusDialog from './components/ToggleStatusDialog.vue';
import UsersFilterBar from './components/UsersFilterBar.vue';
import UsersTable from './components/UsersTable.vue';
import UsersToolbar from './components/UsersToolbar.vue';
import type { UserRow } from '~/shared/users';

const auth = useAuthStore();
const { idToken } = storeToRefs(auth);
const { t } = useI18n();

const { withErrorToast } = useApiError();
const { hasPermission } = usePermission();

const canWriteUsers = computed(() => hasPermission(Permission.Users.Write));
const canCreateUsers = computed(() => hasPermission(Permission.Users.Create));
const canDeleteUsers = computed(() => hasPermission(Permission.Users.Delete));

const appliedSearch = ref('');
const appliedRoleFilter = ref<string | null>(null);
const queryParams = computed(() => ({
  ...(appliedSearch.value ? { q: appliedSearch.value } : {}),
  ...(appliedRoleFilter.value ? { role: appliedRoleFilter.value } : {}),
}));

function applyFilters({ search, role }: { search: string; role: string | null }) {
  appliedSearch.value = search;
  appliedRoleFilter.value = role;
}

const [{ data: users, pending, refresh }, { data: roles }, { data: rolePermissions }] =
  await Promise.all([
    useAuthFetch<UserRow[]>('/api/admin/users', { query: queryParams, default: () => [] }),
    useAuthFetch<Array<{ name: string }>>('/api/admin/roles', { default: () => [] }),
    useAuthFetch<Record<string, string[]>>('/api/admin/role-permissions', {
      default: () => ({}),
    }),
  ]);

const roleOptions = computed(() =>
  (roles.value ?? []).map((r) => ({ title: t(`role.${r.name}`), value: r.name })),
);
const roleFilterOptions = computed(() => roleOptions.value);

const dialog = ref(false);
const editing = ref<UserRow | null>(null);

function openEdit(item: UserRow) {
  editing.value = item;
  dialog.value = true;
}

const createDialog = ref(false);

const linkDialog = ref(false);
const linkDialogValue = ref<string | null>(null);

function openCreate() {
  createDialog.value = true;
}

function onUserCreated(setupLink: string) {
  refresh();
  linkDialogValue.value = setupLink;
  linkDialog.value = true;
}

async function regenerateLink(item: UserRow) {
  const result = await withErrorToast(() =>
    $fetch<{ setupLink: string }>(`/api/admin/users/${item.uid}/setup-link`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken.value}` },
    }),
  );
  if (result) {
    linkDialogValue.value = result.setupLink;
    linkDialog.value = true;
  }
}

const statusDialog = ref(false);
const statusTarget = ref<UserRow | null>(null);

function openToggleStatus(item: UserRow) {
  statusTarget.value = item;
  statusDialog.value = true;
}

const deleteDialog = ref(false);
const deleteTarget = ref<UserRow | null>(null);

function openDelete(item: UserRow) {
  deleteTarget.value = item;
  deleteDialog.value = true;
}

function toCsvCell(value: string | null | undefined): string {
  const str = value ?? '';
  return `"${str.replace(/"/g, '""')}"`;
}

function exportCsv() {
  const rows = users.value ?? [];
  const header = ['uid', 'username', 'email', 'displayName', 'role', 'createdAt'];
  const lines = [
    header.join(','),
    ...rows.map((u) =>
      [
        toCsvCell(u.uid),
        toCsvCell(u.username),
        toCsvCell(u.email),
        toCsvCell(u.displayName),
        toCsvCell(u.role),
        toCsvCell(u.createdAt),
      ].join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
</script>
