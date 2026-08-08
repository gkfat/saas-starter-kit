<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

withDefaults(
  defineProps<{
    elevation?: number | string;
    rounded?: string | boolean;
    padding?: number | string;
    variant?: 'flat' | 'text' | 'elevated' | 'tonal' | 'outlined' | 'plain';
    to?: RouteLocationRaw;
  }>(),
  {
    elevation: 3,
    rounded: 'lg',
    padding: 4,
    variant: undefined,
    to: undefined,
  },
);
</script>

<template>
  <v-card
    :elevation="elevation"
    :rounded="rounded"
    :variant="variant"
    :to="to"
    :class="`pa-${padding}`"
  >
    <slot />
  </v-card>
</template>
