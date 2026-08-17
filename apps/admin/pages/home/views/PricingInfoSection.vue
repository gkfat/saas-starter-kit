<template>
  <v-container class="py-12" :max-width="CONTAINER_WIDTH">
    <v-row justify="center" class="text-center mb-6">
      <v-col cols="12" md="8">
        <div class="text-h5 font-weight-medium">{{ $t('home.pricingInfo.title') }}</div>
      </v-col>
    </v-row>
    <v-row justify="center">
      <v-col v-for="card in pricingInfoCards" :key="card.key" cols="12" sm="6" md="4">
        <HomeCard class="pa-6 h-100">
          <v-icon :icon="card.icon" color="primary" size="32" class="mb-3" />
          <div class="text-h6 mb-1">{{ $t(`home.pricingInfo.items.${card.key}.title`) }}</div>
          <v-chip size="small" color="accent" variant="tonal" class="mb-3">
            {{ $t(`home.pricingInfo.items.${card.key}.tag`) }}
          </v-chip>
          <div class="text-body-2 text-medium-emphasis">
            {{ $t(`home.pricingInfo.items.${card.key}.description`) }}
          </div>
        </HomeCard>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import HomeCard from '../components/HomeCard.vue';
import { CONTAINER_WIDTH } from './constants';

const pricingInfoCards = [
  { key: '0', icon: 'mdi-package-variant-closed' },
  { key: '1', icon: 'mdi-puzzle-outline' },
  { key: '2', icon: 'mdi-palette-outline' },
  { key: '3', icon: 'mdi-rocket-launch-outline' },
  { key: '4', icon: 'mdi-tools' },
];
</script>
