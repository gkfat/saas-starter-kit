<template>
  <v-card variant="elevated" :elevation="2" :rounded="rounded" class="border">
    <slot />
  </v-card>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    rounded?: string;
  }>(),
  { rounded: 'lg' },
);
</script>
