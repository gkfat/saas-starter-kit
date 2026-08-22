<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean;
    disabled?: boolean;
  }>(),
  { loading: false, disabled: false },
);

defineEmits<{ click: [] }>();
</script>

<template>
  <div class="booking-bottom-action">
    <v-btn
      color="primary"
      block
      size="large"
      :loading="loading"
      :disabled="disabled"
      @click="$emit('click')"
    >
      <slot />
    </v-btn>
  </div>
</template>

<style scoped>
.booking-bottom-action {
  position: fixed;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  padding: 0 16px;
  z-index: 5;
}
</style>
