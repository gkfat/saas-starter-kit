<template>
  <div>
    <LayoutBreadcrumb />
    <LayoutPageHeader :title="$t('permissions.title')" />
    <v-card elevation="2">
      <v-data-table :headers="headers" :items="permissions" :loading="pending" item-value="name">
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('permissions.noData') }}</span>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

const headers = computed(() => [
  { title: t('permissions.name'), key: 'name' },
  { title: t('permissions.description'), key: 'description' },
]);

const { data: permissions, pending } = await useAuthFetch('/api/admin/permissions', {
  default: () => [],
});
</script>
