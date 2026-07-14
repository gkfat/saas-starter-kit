<template>
  <div class="text-h5 font-weight-medium mb-4">{{ title }}</div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>
