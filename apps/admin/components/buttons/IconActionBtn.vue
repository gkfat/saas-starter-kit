<template>
  <v-btn variant="flat" :icon="icon" size="x-small" class="border" rounded="sm" />
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
}>();
</script>
