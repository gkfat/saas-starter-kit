<template>
  <div>
    <LayoutBreadcrumb />
    <LayoutPageHeader :title="$t('dashboard.title')" />
    <v-row v-if="stats" dense align="stretch">
      <v-col cols="12" md="6" lg="4">
        <UserOverviewCard :overview="stats.userOverview" />
      </v-col>
      <v-col cols="12" md="6" lg="4">
        <UserGrowthCard :growth="stats.userGrowth" />
      </v-col>
      <v-col cols="12" md="6" lg="4">
        <ActiveUsersCard :active-users="stats.activeUsers" />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import type { DashboardStats } from '~/server/modules/dashboard';
import UserOverviewCard from './components/UserOverviewCard.vue';
import UserGrowthCard from './components/UserGrowthCard.vue';
import ActiveUsersCard from './components/ActiveUsersCard.vue';

const { data: stats, refresh } = await useAuthFetch<DashboardStats>('/api/dashboard/stats');

let intervalId: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  intervalId = setInterval(refresh, 60_000);
});

onUnmounted(() => {
  clearInterval(intervalId);
});
</script>
