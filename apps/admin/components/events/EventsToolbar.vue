<template>
  <div class="d-flex ga-2 mb-4">
    <ButtonsAppButton
      v-if="canCreate"
      kind="primary"
      prepend-icon="mdi-plus"
      @click="emit('create')"
    >
      {{ $t('events.create') }}
    </ButtonsAppButton>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  canCreate: boolean;
}>();

const emit = defineEmits<{
  create: [];
}>();
</script>
