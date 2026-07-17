<template>
  <div class="d-flex ga-2 mb-4">
    <v-btn variant="text" class="border" prepend-icon="mdi-export" @click="emit('export')">
      {{ $t('users.exportCsv') }}
    </v-btn>
    <v-btn
      v-if="canCreateUsers"
      color="primary"
      variant="flat"
      prepend-icon="mdi-account-plus"
      @click="emit('create')"
    >
      {{ $t('users.createUser') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  canCreateUsers: boolean;
}>();

const emit = defineEmits<{
  export: [];
  create: [];
}>();
</script>
