<template>
  <div class="d-flex ga-2 mb-4">
    <ButtonsAppButton
      v-if="canRedeem"
      kind="secondary"
      prepend-icon="mdi-qrcode-scan"
      @click="emit('redeem')"
    >
      {{ $t('coupons.redeemButton') }}
    </ButtonsAppButton>
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
  canRedeem: boolean;
}>();

const emit = defineEmits<{
  create: [];
  redeem: [];
}>();
</script>
