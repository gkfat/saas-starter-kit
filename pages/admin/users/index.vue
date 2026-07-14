<template>
  <div>
    <LayoutBreadcrumb />
    <LayoutPageHeader title="Users" />
    <v-card elevation="2">
      <v-card-text class="pb-0">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Search by email"
          clearable
          hide-details
          density="compact"
          style="max-width: 360px"
        />
      </v-card-text>
      <v-data-table :headers="headers" :items="filteredUsers" :loading="pending" item-value="uid">
        <template #no-data>
          <span class="text-medium-emphasis">No users found</span>
        </template>
        <template #[`item.uid`]="{ item }">
          <span class="text-caption font-mono text-medium-emphasis">{{ item.uid }}</span>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="400">
      <v-card>
        <v-card-title class="pa-4">Edit Role — {{ editing?.email }}</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedRole"
            :items="roleNames"
            label="Role"
            density="compact"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/stores/auth';

type UserRow = {
  uid: string;
  email: string;
  displayName: string;
  role: string | null;
  createdAt: string;
};

const auth = useAuthStore();
const { idToken } = storeToRefs(auth);

const { showSuccess } = useToast();
const { withErrorToast } = useApiError();

const headers = [
  { title: 'UID', key: 'uid' },
  { title: 'Email', key: 'email' },
  { title: 'Display Name', key: 'displayName' },
  { title: 'Role', key: 'role' },
  { title: 'Created', key: 'createdAt' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
];

const [{ data: users, pending, refresh }, { data: roles }] = await Promise.all([
  useAuthFetch<UserRow[]>('/api/admin/users', { default: () => [] }),
  useAuthFetch<Array<{ name: string }>>('/api/admin/roles', { default: () => [] }),
]);

const roleNames = computed(() => (roles.value ?? []).map((r) => r.name));

const search = ref('');
const filteredUsers = computed(() => {
  const q = search.value?.toLowerCase() ?? '';
  return (users.value ?? []).filter((u) => !q || u.email.toLowerCase().includes(q));
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
    showSuccess('使用者角色已更新');
  }
  saving.value = false;
}
</script>
