<template>
  <v-row v-if="filters.length > 0" dense>
    <v-col v-for="filter in filters" :key="filter.key" cols="auto">
      <v-chip
        size="small"
        variant="tonal"
        label
        :closable="filter.removable"
        @click:close="$emit('remove', filter.key)"
      >
        {{ filter.label }}: {{ filter.value }}
      </v-chip>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import type { AppliedFilter } from '~/components/filter-bar/types';

defineProps<{ filters: AppliedFilter[] }>();
defineEmits<{ remove: [key: string] }>();
</script>
