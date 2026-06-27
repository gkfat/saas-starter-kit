<template>
  <v-row>
    <v-col cols="12">
      <v-card elevation="2">
        <v-card-title class="pa-6 pb-0 text-h5">Users</v-card-title>

        <v-data-table
          :headers="headers"
          :items="formattedUsers"
          :loading="pending"
          item-value="uid"
        >
          <template #no-data>
            <span class="text-medium-emphasis">No users found</span>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const headers = [
  { title: 'UID', key: 'uid', sortable: false },
  { title: 'Email', key: 'email' },
  { title: 'Display Name', key: 'displayName' },
  { title: 'Phone', key: 'phone' },
  { title: 'Tenant', key: 'tenantId' },
  { title: 'Created At', key: 'createdAt' },
];

const { data: users, pending } = await useAuthFetch('/api/admin/users', {
  default: () => [],
});

const formattedUsers = computed(() =>
  (users.value ?? []).map((u) => ({
    ...u,
    createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : '—',
  })),
);
</script>
