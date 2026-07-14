<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="pa-6 pb-0 text-h5">{{ $t('roles.title') }}</v-card-title>

          <v-data-table
            :headers="headers"
            :items="rolesWithPermissions"
            :loading="pending"
            item-value="name"
          >
            <template #no-data>
              <span class="text-medium-emphasis">{{ $t('roles.noData') }}</span>
            </template>

            <template v-if="isSuperadmin" #[`item.actions`]="{ item }">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="480">
      <v-card>
        <v-card-title class="pa-4"
          >{{ $t('roles.editPermissions') }} — {{ editing?.name }}</v-card-title
        >
        <v-card-text>
          <v-checkbox
            v-for="perm in allPermissions"
            :key="perm.name"
            v-model="selectedPermissions"
            :label="perm.name"
            :value="perm.name"
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
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
const { isSuperadmin, idToken } = storeToRefs(auth);
const { t } = useI18n();

const headers = computed(() => [
  { title: t('roles.name'), key: 'name' },
  { title: t('roles.description'), key: 'description' },
  { title: t('roles.permissions'), key: 'permissions', sortable: false },
  ...(isSuperadmin.value
    ? [{ title: '', key: 'actions', sortable: false, align: 'end' as const }]
    : []),
]);

const [
  { data: roles, pending, refresh: refreshRoles },
  { data: rolePermissions, refresh: refreshRolePermissions },
  { data: allPermissions },
] = await Promise.all([
  useAuthFetch('/api/admin/roles', { default: () => [] }),
  useAuthFetch('/api/admin/role-permissions', { default: () => ({}) }),
  useAuthFetch('/api/admin/permissions', { default: () => [] }),
]);

const rolesWithPermissions = computed(() =>
  (roles.value ?? []).map((role) => ({
    ...role,
    permissions: (rolePermissions.value?.[role.name] ?? []).join(', ') || '—',
  })),
);

type RoleRow = (typeof rolesWithPermissions.value)[number];

const dialog = ref(false);
const saving = ref(false);
const editing = ref<RoleRow | null>(null);
const selectedPermissions = ref<string[]>([]);

function openEdit(item: RoleRow) {
  editing.value = item;
  selectedPermissions.value = rolePermissions.value?.[item.name] ?? [];
  dialog.value = true;
}

async function save() {
  if (!editing.value) return;
  saving.value = true;
  try {
    await $fetch('/api/admin/role-permissions', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${idToken.value}` },
      body: { roleName: editing.value.name, permissions: selectedPermissions.value },
    });
    dialog.value = false;
    await Promise.all([refreshRoles(), refreshRolePermissions()]);
  } finally {
    saving.value = false;
  }
}
</script>
