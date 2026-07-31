<template>
  <CardsAppCard class="h-100">
    <v-card-title class="py-3">{{ $t('dashboard.userGrowth.title') }}</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">
            {{ $t('dashboard.userGrowth.today') }}
          </div>
          <div class="text-h5">{{ growth.today }}</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">
            {{ $t('dashboard.userGrowth.thisWeek') }}
          </div>
          <div class="text-h5">{{ growth.thisWeek }}</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">
            {{ $t('dashboard.userGrowth.thisMonth') }}
          </div>
          <div class="text-h5">{{ growth.thisMonth }}</div>
        </v-col>
      </v-row>
    </v-card-text>
  </CardsAppCard>
</template>

<script setup lang="ts">
defineProps<{
  growth: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}>();
</script>
