<template>
  <div class="app-toast-container">
    <TransitionGroup name="toast" tag="div" class="toast-list">
      <v-card
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-item mb-2"
        :color="colorMap[toast.type]"
        elevation="4"
        min-width="280"
        max-width="400"
      >
        <v-card-text class="d-flex align-center pa-3">
          <v-icon :icon="iconMap[toast.type]" size="small" class="mr-2" />
          <span class="text-body-2 flex-grow-1">{{ toast.message }}</span>
          <v-btn icon size="x-small" variant="text" @click="remove(toast.id)">
            <v-icon size="small">mdi-close</v-icon>
          </v-btn>
        </v-card-text>
      </v-card>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
const { toasts, remove } = useToast();

const colorMap = { success: 'success', error: 'error', info: 'info' } as const;
const iconMap = {
  success: 'mdi-check-circle',
  error: 'mdi-alert-circle',
  info: 'mdi-information',
} as const;
</script>

<style scoped>
.app-toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.toast-item {
  pointer-events: all;
}

.toast-enter-active {
  animation: toast-slide-up 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-fade-out 0.25s ease-in forwards;
}

.toast-move {
  transition: transform 0.3s ease;
}

@keyframes toast-slide-up {
  from {
    transform: translateY(16px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes toast-fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
