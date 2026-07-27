<template>
  <div class="d-flex ga-2 mb-4">
    <ButtonsAppButton kind="secondary" prepend-icon="mdi-export" @click="emit('export')">
      {{ $t('users.exportCsv') }}
    </ButtonsAppButton>
    <ButtonsAppButton
      v-if="canCreateUsers"
      kind="primary"
      prepend-icon="mdi-account-plus"
      @click="emit('create')"
    >
      {{ createLabel }}
    </ButtonsAppButton>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  canCreateUsers: boolean;
  createLabel: string;
}>();

const emit = defineEmits<{
  export: [];
  create: [];
}>();
</script>
