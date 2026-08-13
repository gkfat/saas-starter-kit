<template>
  <div>
    <LayoutPageHeader :title="$t('dashboard.title')" />
    <v-row v-if="stats" dense align="stretch">
      <v-col cols="6" md="3">
        <StatCard :title="$t('dashboard.userOverview.total')" :value="stats.userOverview.total" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard :title="$t('role.admin')" :value="stats.userOverview.byRole.admin" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard :title="$t('role.member')" :value="stats.userOverview.byRole.member" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard
          :title="$t('dashboard.activeUsers.activeRate')"
          :value="`${activeRatePercent}%`"
        />
      </v-col>
      <v-col cols="12">
        <UserGrowthCard />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import type { DashboardStats } from '@saas-starter-kit/shared';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/stores/auth';
import StatCard from './components/StatCard.vue';
import UserGrowthCard from './components/UserGrowthCard.vue';

const { isLoggedIn } = storeToRefs(useAuthStore());
const { data: stats, refresh } = await useAuthFetch<DashboardStats>('/api/dashboard/stats');

const activeRatePercent = computed(() =>
  stats.value ? Math.round(stats.value.activeUsers.activeRate * 100) : 0,
);

let intervalId: ReturnType<typeof setInterval> | undefined;

function stopPolling() {
  clearInterval(intervalId);
  intervalId = undefined;
}

onMounted(() => {
  intervalId = setInterval(refresh, 60_000);
});

onUnmounted(stopPolling);

watch(isLoggedIn, (loggedIn) => {
  if (!loggedIn) stopPolling();
});
</script>
