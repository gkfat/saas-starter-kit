<template>
  <v-card variant="flat" :elevation="elevation" :rounded="rounded" class="border">
    <slot />
  </v-card>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    rounded?: string;
    elevation?: number | string;
  }>(),
  { rounded: 'lg', elevation: 0 },
);
</script>
