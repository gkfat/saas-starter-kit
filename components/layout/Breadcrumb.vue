<template>
  <nav class="d-flex align-center ga-1 mb-3" style="font-size: 11px; color: #5f6368">
    <template v-for="(crumb, i) in crumbs" :key="crumb.path">
      <span v-if="i > 0" class="text-disabled">/</span>
      <NuxtLink v-if="crumb.to" :to="crumb.to" class="text-decoration-none" style="color: inherit">
        {{ crumb.label }}
      </NuxtLink>
      <span v-else>{{ crumb.label }}</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute();

const crumbs = computed(() => {
  const segments = route.path.split('/').filter(Boolean);
  return segments.map((seg, i) => ({
    path: seg,
    label: seg.charAt(0).toUpperCase() + seg.slice(1),
    to: i < segments.length - 1 ? '/' + segments.slice(0, i + 1).join('/') : undefined,
  }));
});
</script>
