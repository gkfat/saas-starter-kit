<template>
  <v-container>
    <LayoutPageHeader :title="$t('pricing.title')" />
    <div class="text-body-1 text-medium-emphasis mb-8">{{ $t('pricing.subtitle') }}</div>

    <v-row justify="center">
      <v-col v-for="plan in plans" :key="plan.key" cols="12" sm="6" md="4">
        <CardsAppCard class="pa-6 h-100 d-flex flex-column">
          <div class="text-h6 mb-1">{{ $t(`pricing.plans.${plan.key}.title`) }}</div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            {{ $t(`pricing.plans.${plan.key}.tagline`) }}
          </div>
          <div class="text-h4 font-weight-medium mb-4">
            {{ $t(`pricing.plans.${plan.key}.price`) }}
          </div>
          <v-list density="compact" class="flex-grow-1">
            <v-list-item
              v-for="n in plan.featureCount"
              :key="n"
              :title="$t(`pricing.plans.${plan.key}.features.${n - 1}`)"
              prepend-icon="mdi-check"
            />
          </v-list>
        </CardsAppCard>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ROUTES } from '~/config/app-routes';

definePageMeta({ path: ROUTES.pricing });

const plans = [
  { key: 'free', featureCount: 3 },
  { key: 'pro', featureCount: 4 },
  { key: 'enterprise', featureCount: 4 },
];
</script>
