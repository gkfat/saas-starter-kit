<template>
  <CardsAppCard class="h-100">
    <v-card-title class="py-3">{{ $t('level.cardTitle') }}</v-card-title>
    <v-card-text>
      <template v-if="level">
        <v-row>
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('level.levelNumber') }}</div>
            <div>{{ level.levelName }}（Lv.{{ level.levelNumber }}）</div>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">
              {{ $t('level.currentPeriodTotal') }}
            </div>
            <div>{{ level.currentPeriodTotal }}</div>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('level.periodStart') }}</div>
            <div>{{ formatDateTime(level.startDate) }}</div>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('level.periodEnd') }}</div>
            <div>{{ formatDateTime(level.endDate) }}</div>
          </v-col>
        </v-row>
      </template>
      <span v-else class="text-medium-emphasis">{{ $t('level.notInitialized') }}</span>
    </v-card-text>
  </CardsAppCard>
</template>

<script setup lang="ts">
import type { GetLevelResult } from '@saas-starter-kit/shared';

defineProps<{
  level: GetLevelResult | null;
}>();
</script>
