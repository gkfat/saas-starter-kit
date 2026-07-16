<template>
  <v-row>
    <v-col cols="12">
      <v-card elevation="2">
        <v-card-title class="pa-6 pb-0 text-h5">{{ $t('users.title') }}</v-card-title>

        <v-data-table
          :headers="headers"
          :items="formattedUsers"
          :loading="pending"
          item-value="uid"
        >
          <template #no-data>
            <span class="text-medium-emphasis">{{ $t('users.noData') }}</span>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const { t } = useI18n();

const headers = computed(() => [
  { title: t('users.uid'), key: 'uid', sortable: false },
  { title: t('users.email'), key: 'email' },
  { title: t('users.displayName'), key: 'displayName' },
  { title: t('users.phone'), key: 'phone' },
  { title: t('users.createdAt'), key: 'createdAt' },
]);

const { data: users, pending } = await useAuthFetch('/api/admin/users', {
  default: () => [],
});

const formattedUsers = computed(() =>
  (users.value ?? []).map((u) => ({
    ...u,
    createdAt: formatDateTime(u.createdAt),
  })),
);
</script>
