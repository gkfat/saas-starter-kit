<template>
  <v-card rounded="lg" class="dialog-card">
    <slot />
  </v-card>
</template>

<style scoped>
.dialog-card {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.dialog-card > :deep(.v-card-title),
.dialog-card > :deep(.v-card-actions) {
  flex: none;
}

.dialog-card > :deep(.v-card-text) {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
</style>
