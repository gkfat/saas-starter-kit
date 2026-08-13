<template>
  <CardsAppCard class="h-100">
    <v-card-text>
      <div class="text-caption text-medium-emphasis">{{ title }}</div>
      <div class="text-h5">{{ value }}</div>
    </v-card-text>
  </CardsAppCard>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  value: string | number;
}>();
</script>
