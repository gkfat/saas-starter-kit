<template>
  <div>
    <LayoutBreadcrumb />
    <LayoutPageHeader :title="$t('users.title')" />
    <v-card elevation="2">
      <v-card-text class="pb-0 d-flex flex-wrap ga-3 align-center">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          :label="$t('users.searchByUsernameOrEmail')"
          clearable
          hide-details
          density="compact"
          style="max-width: 360px"
        />
        <v-select
          v-model="roleFilter"
          :items="roleFilterOptions"
          item-title="title"
          item-value="value"
          :label="$t('users.filterByRole')"
          clearable
          hide-details
          density="compact"
          style="max-width: 220px"
        />
        <v-spacer />
        <v-btn variant="outlined" prepend-icon="mdi-file-export" @click="exportCsv">
          {{ $t('users.exportCsv') }}
        </v-btn>
        <v-btn
          v-if="canCreateUsers"
          color="primary"
          prepend-icon="mdi-account-plus"
          @click="openCreate"
        >
          {{ $t('users.createUser') }}
        </v-btn>
      </v-card-text>
      <v-data-table :headers="headers" :items="users ?? []" :loading="pending" item-value="uid">
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
          <v-chip size="small" :color="statusColor(item)">{{ statusLabel(item) }}</v-chip>
        </template>
        <template #[`item.lastLoginAt`]="{ item }">
          <span>{{ item.lastLoginAt ? formatDateTime(item.lastLoginAt) : '-' }}</span>
        </template>
        <template #[`item.createdAt`]="{ item }">
          <span>{{ formatDateTime(item.createdAt) }}</span>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-btn
            v-if="canWriteUsers"
            icon="mdi-pencil"
            size="small"
            variant="text"
            @click="openEdit(item)"
          />
          <v-btn
            v-if="canWriteUsers"
            :icon="item.disabled ? 'mdi-account-check-outline' : 'mdi-account-off-outline'"
            size="small"
            variant="text"
            @click="openToggleStatus(item)"
          />
          <v-btn
            v-if="canWriteUsers && item.passwordSetupPending"
            icon="mdi-link-variant"
            size="small"
            variant="text"
            @click="regenerateLink(item)"
          />
          <v-btn
            v-if="canDeleteUsers && item.disabled"
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            color="error"
            @click="openDelete(item)"
          />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="pa-4"
          >{{ $t('users.editRole') }} — {{ editing?.username }}</v-card-title
        >
        <v-card-text>
          <div class="text-caption text-medium-emphasis mb-1">{{ $t('users.role') }}</div>
          <v-select
            v-model="selectedRole"
            :items="roleOptions"
            item-title="title"
            item-value="value"
            hide-details="auto"
          />
          <div class="mt-3">
            <v-chip
              v-for="perm in selectedRolePermissions"
              :key="perm"
              size="small"
              class="mr-1 mb-1"
            >
              {{ $t(`permission.${perm}`) }}
            </v-chip>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="createDialog" max-width="480" persistent>
      <v-card>
        <v-card-title class="pa-4">{{ $t('users.createUser') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="createForm.username"
            :label="$t('auth.username')"
            :hint="$t('auth.usernameHint')"
            persistent-hint
            :disabled="creating"
            class="mb-1"
          />
          <v-text-field
            v-model="createForm.displayName"
            :label="$t('users.displayNameOptional')"
            :disabled="creating"
            class="mb-1"
          />
          <v-text-field
            v-model="createForm.email"
            :label="$t('auth.emailOptional')"
            type="email"
            :disabled="creating"
            class="mb-1"
          />
          <v-text-field
            v-model="createForm.phone"
            :label="$t('auth.phoneOptional')"
            type="tel"
            :disabled="creating"
            class="mb-1"
          />
          <div class="text-caption text-medium-emphasis mb-1">{{ $t('users.role') }}</div>
          <v-select
            v-model="createForm.role"
            :items="roleOptions"
            item-title="title"
            item-value="value"
            hide-details="auto"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="createDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="creating" @click="createUser">{{
            $t('common.create')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="linkDialog" max-width="480" persistent>
      <v-card>
        <v-card-title class="pa-4">{{ $t('users.setupLinkTitle') }}</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-3">{{ $t('users.setupLinkHint') }}</p>
          <v-text-field :model-value="linkDialogValue" readonly density="compact" />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" @click="copySetupLink">{{ $t('users.copyLink') }}</v-btn>
          <v-btn color="primary" @click="linkDialog = false">{{ $t('common.confirm') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="statusDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="pa-4">{{
          statusTarget?.disabled ? $t('users.enableUser') : $t('users.disableUser')
        }}</v-card-title>
        <v-card-text>
          {{ $t('users.disableConfirm', { username: statusTarget?.username }) }}
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="statusDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="statusSaving" @click="confirmToggleStatus">{{
            $t('common.confirm')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="pa-4">{{ $t('users.deleteUser') }}</v-card-title>
        <v-card-text>
          {{ $t('users.deleteConfirm', { username: deleteTarget?.username }) }}
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="error" :loading="deleting" @click="confirmDelete">{{
            $t('common.confirm')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { Permission } from '~/shared/permissions';
import { Role } from '~/shared/roles';
import { isValidUsername } from '~/shared/utils/validation';
import { useAuthStore } from '~/stores/auth';

type UserRow = {
  uid: string;
  username: string;
  email: string | null;
  displayName: string;
  role: string | null;
  disabled: boolean;
  passwordSetupPending: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

const auth = useAuthStore();
const { idToken } = storeToRefs(auth);
const { t } = useI18n();

const { showSuccess, showError } = useToast();
const { withErrorToast } = useApiError();
const { hasPermission } = usePermission();

const canWriteUsers = computed(() => hasPermission(Permission.Users.Write));
const canCreateUsers = computed(() => hasPermission(Permission.Users.Create));
const canDeleteUsers = computed(() => hasPermission(Permission.Users.Delete));

const headers = computed(() => [
  { title: t('users.uid'), key: 'uid' },
  { title: t('auth.username'), key: 'username' },
  { title: t('users.email'), key: 'email' },
  { title: t('users.displayName'), key: 'displayName' },
  { title: t('users.role'), key: 'role' },
  { title: t('users.status.label'), key: 'status', sortable: false },
  { title: t('users.lastLoginAt'), key: 'lastLoginAt' },
  { title: t('users.createdAt'), key: 'createdAt' },
  ...(canWriteUsers.value || canDeleteUsers.value
    ? [{ title: '', key: 'actions', sortable: false, align: 'end' as const }]
    : []),
]);

const search = ref('');
const roleFilter = ref<string | null>(null);
const queryParams = computed(() => ({
  ...(search.value ? { q: search.value } : {}),
  ...(roleFilter.value ? { role: roleFilter.value } : {}),
}));

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

const selectedRolePermissions = computed(() => rolePermissions.value?.[selectedRole.value] ?? []);

const dialog = ref(false);
const saving = ref(false);
const editing = ref<UserRow | null>(null);
const selectedRole = ref('');

function openEdit(item: UserRow) {
  editing.value = item;
  selectedRole.value = item.role ?? '';
  dialog.value = true;
}

async function save() {
  if (!editing.value) return;
  saving.value = true;
  const result = await withErrorToast(() =>
    $fetch<unknown>(`/api/admin/users/${editing.value!.uid}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${idToken.value}` },
      body: { role: selectedRole.value },
    }),
  );
  if (result !== null) {
    dialog.value = false;
    await refresh();
    showSuccess(t('users.updateRoleSuccess'));
  }
  saving.value = false;
}

const createDialog = ref(false);
const creating = ref(false);
const createForm = ref({
  username: '',
  displayName: '',
  email: '',
  phone: '',
  role: '',
});

const linkDialog = ref(false);
const linkDialogValue = ref<string | null>(null);

function openCreate() {
  createForm.value = { username: '', displayName: '', email: '', phone: '', role: Role.Member };
  createDialog.value = true;
}

async function createUser() {
  if (!isValidUsername(createForm.value.username)) {
    showError(t('auth.error.invalidUsername'));
    return;
  }
  if (!createForm.value.role) {
    showError(t('auth.error.registerDefault'));
    return;
  }

  creating.value = true;
  try {
    const { setupLink } = await $fetch<{ uid: string; setupLink: string }>('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken.value}` },
      body: {
        username: createForm.value.username,
        displayName: createForm.value.displayName || undefined,
        email: createForm.value.email || undefined,
        phone: createForm.value.phone || undefined,
        role: createForm.value.role,
      },
    });
    createDialog.value = false;
    await refresh();
    showSuccess(t('users.createSuccess'));
    linkDialogValue.value = setupLink;
    linkDialog.value = true;
  } catch (e: unknown) {
    const statusCode = (e as { data?: { statusCode?: number } }).data?.statusCode;
    if (statusCode === 409) {
      showError(t('auth.error.usernameTaken'));
    } else {
      showError(t('auth.error.registerDefault'));
    }
  } finally {
    creating.value = false;
  }
}

async function copySetupLink() {
  if (!linkDialogValue.value) return;
  await navigator.clipboard.writeText(linkDialogValue.value);
  showSuccess(t('common.copied'));
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

function statusLabel(item: UserRow): string {
  if (item.disabled) return t('users.status.disabled');
  if (item.passwordSetupPending) return t('users.status.pendingPassword');
  return t('users.status.enabled');
}

function statusColor(item: UserRow): string {
  if (item.disabled) return 'default';
  if (item.passwordSetupPending) return 'warning';
  return 'success';
}

const statusDialog = ref(false);
const statusSaving = ref(false);
const statusTarget = ref<UserRow | null>(null);

function openToggleStatus(item: UserRow) {
  statusTarget.value = item;
  statusDialog.value = true;
}

async function confirmToggleStatus() {
  if (!statusTarget.value) return;
  statusSaving.value = true;
  const result = await withErrorToast(() =>
    $fetch<unknown>(`/api/admin/users/${statusTarget.value!.uid}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${idToken.value}` },
      body: { disabled: !statusTarget.value!.disabled },
    }),
  );
  if (result !== null) {
    statusDialog.value = false;
    await refresh();
    showSuccess(t('users.updateStatusSuccess'));
  }
  statusSaving.value = false;
}

const deleteDialog = ref(false);
const deleting = ref(false);
const deleteTarget = ref<UserRow | null>(null);

function openDelete(item: UserRow) {
  deleteTarget.value = item;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  const result = await withErrorToast(() =>
    $fetch<unknown>(`/api/admin/users/${deleteTarget.value!.uid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken.value}` },
    }),
  );
  if (result !== null) {
    deleteDialog.value = false;
    await refresh();
    showSuccess(t('users.deleteSuccess'));
  }
  deleting.value = false;
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
