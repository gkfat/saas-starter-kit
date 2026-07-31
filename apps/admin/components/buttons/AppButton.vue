<template>
  <v-btn :variant="variant" :class="rootClass" :color="resolvedColor" :size="size">
    <slot />
  </v-btn>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    kind: 'primary' | 'secondary' | 'text';
    color?: string;
    size?: string;
  }>(),
  { color: undefined, size: undefined },
);

const variant = computed(() => (props.kind === 'text' ? 'text' : 'flat'));
const rootClass = computed(() => (props.kind === 'secondary' ? 'border' : undefined));
const resolvedColor = computed(
  () => props.color ?? (props.kind === 'primary' ? 'primary' : undefined),
);
</script>
