<template>
  <div>
    <LayoutBreadcrumb />
    <LayoutPageHeader :title="$t('users.title')" />
    <v-card elevation="2">
      <v-card-text class="pb-0">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          :label="$t('users.searchByUsernameOrEmail')"
          clearable
          hide-details
          density="compact"
          style="max-width: 360px"
        />
      </v-card-text>
      <v-data-table :headers="headers" :items="filteredUsers" :loading="pending" item-value="uid">
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
        <template #[`item.createdAt`]="{ item }">
          <span>{{ formatDateTime(item.createdAt) }}</span>
        </template>
        <template v-if="canWriteUsers" #[`item.actions`]="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="400">
      <v-card>
        <v-card-title class="pa-4"
          >{{ $t('users.editRole') }} — {{ editing?.username }}</v-card-title
        >
        <v-card-text>
          <v-select
            v-model="selectedRole"
            :items="roleNames"
            :label="$t('users.role')"
            density="compact"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { Permission } from '~/shared/permissions';
import { useAuthStore } from '~/stores/auth';

type UserRow = {
  uid: string;
  username: string;
  email: string | null;
  displayName: string;
  role: string | null;
  createdAt: string;
};

const auth = useAuthStore();
const { idToken } = storeToRefs(auth);
const { t } = useI18n();

const { showSuccess } = useToast();
const { withErrorToast } = useApiError();
const { hasPermission } = usePermission();

const canWriteUsers = computed(() => hasPermission(Permission.Users.Write));

const headers = computed(() => [
  { title: t('users.uid'), key: 'uid' },
  { title: t('auth.username'), key: 'username' },
  { title: t('users.email'), key: 'email' },
  { title: t('users.displayName'), key: 'displayName' },
  { title: t('users.role'), key: 'role' },
  { title: t('users.createdAt'), key: 'createdAt' },
  ...(canWriteUsers.value
    ? [{ title: '', key: 'actions', sortable: false, align: 'end' as const }]
    : []),
]);

const [{ data: users, pending, refresh }, { data: roles }] = await Promise.all([
  useAuthFetch<UserRow[]>('/api/admin/users', { default: () => [] }),
  useAuthFetch<Array<{ name: string }>>('/api/admin/roles', { default: () => [] }),
]);

const roleNames = computed(() => (roles.value ?? []).map((r) => r.name));

const search = ref('');
const filteredUsers = computed(() => {
  const q = search.value?.toLowerCase() ?? '';
  return (users.value ?? []).filter(
    (u) => !q || u.username.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q),
  );
});

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
</script>
