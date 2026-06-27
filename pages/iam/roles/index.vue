<template>
  <v-row>
    <v-col cols="12">
      <v-card elevation="2">
        <v-card-title class="pa-6 pb-0 text-h5">Roles</v-card-title>

        <v-data-table
          :headers="headers"
          :items="rolesWithPermissions"
          :loading="pending"
          item-value="name"
        >
          <template #no-data>
            <span class="text-medium-emphasis">No roles found</span>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Description', key: 'description' },
  { title: 'Permissions', key: 'permissions', sortable: false },
];

const [{ data: roles, pending }, { data: rolePermissions }] = await Promise.all([
  useAuthFetch('/api/admin/roles', { default: () => [] }),
  useAuthFetch('/api/admin/role-permissions', { default: () => ({}) }),
]);

const rolesWithPermissions = computed(() =>
  (roles.value ?? []).map((role) => ({
    ...role,
    permissions: (rolePermissions.value?.[role.name] ?? []).join(', ') || '—',
  })),
);
</script>
