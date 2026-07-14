<template>
  <div>
    <LayoutBreadcrumb />
    <LayoutPageHeader title="Permissions" />
    <v-card elevation="2">
      <v-data-table :headers="headers" :items="permissions" :loading="pending" item-value="name">
        <template #no-data>
          <span class="text-medium-emphasis">No permissions found</span>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Description', key: 'description' },
];

const { data: permissions, pending } = await useAuthFetch('/api/admin/permissions', {
  default: () => [],
});
</script>
