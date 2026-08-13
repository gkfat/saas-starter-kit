<template>
  <CardsAppCard>
    <v-card-title class="py-3 d-flex flex-wrap ga-3 align-center justify-space-between">
      <span>{{ $t('dashboard.userGrowth.title') }}</span>
      <v-chip-group v-model="range" mandatory color="primary">
        <v-chip v-for="option in rangeOptions" :key="option" :value="option" size="small" filter>
          {{ $t(`dashboard.userGrowth.range.${option}`) }}
        </v-chip>
      </v-chip-group>
    </v-card-title>
    <v-card-text>
      <div class="chart-wrapper">
        <Line v-if="chartData" :data="chartData" :options="chartOptions" />
      </div>
    </v-card-text>
  </CardsAppCard>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'vue-chartjs';
import { GrowthRange } from '@saas-starter-kit/shared';
import type { UserGrowthSeries } from '@saas-starter-kit/shared';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const { t } = useI18n();

const rangeOptions = Object.values(GrowthRange);
const range = ref<GrowthRange>(GrowthRange.Week);

const { data: series } = await useAuthFetch<UserGrowthSeries>('/api/dashboard/user-growth', {
  query: computed(() => ({ range: range.value })),
});

const chartData = computed(() => {
  if (!series.value) return null;
  return {
    labels: series.value.points.map((point) => point.label),
    datasets: [
      {
        label: t('dashboard.userGrowth.seriesName'),
        data: series.value.points.map((point) => point.count),
        borderColor: '#1867C0',
        backgroundColor: 'rgba(24, 103, 192, 0.15)',
        tension: 0.3,
        fill: true,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
    },
  },
};
</script>

<style scoped>
.chart-wrapper {
  height: 320px;
}
</style>
