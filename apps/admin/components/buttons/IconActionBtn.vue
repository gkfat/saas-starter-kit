<template>
  <v-btn variant="flat" :icon="icon" :size="size" class="border" rounded="sm" />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string;
    size?: string | number;
  }>(),
  { size: 'x-small' },
);
</script>
