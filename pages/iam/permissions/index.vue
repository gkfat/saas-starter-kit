<template>
  <v-row>
    <v-col cols="12">
      <v-card elevation="2">
        <v-card-title class="pa-6 pb-0 text-h5">Permissions</v-card-title>

        <v-data-table :headers="headers" :items="permissions" :loading="pending" item-value="name">
          <template #no-data>
            <span class="text-medium-emphasis">No permissions found</span>
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
];

const { data: permissions, pending } = await useAuthFetch('/api/admin/permissions', {
  default: () => [],
});
</script>
