<template>
  <div class="d-flex ga-2 mb-4">
    <ButtonsAppButton
      v-if="canWrite"
      kind="primary"
      prepend-icon="mdi-plus"
      @click="emit('create')"
    >
      {{ $t('coupons.create') }}
    </ButtonsAppButton>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  canWrite: boolean;
}>();

const emit = defineEmits<{
  create: [];
}>();
</script>
