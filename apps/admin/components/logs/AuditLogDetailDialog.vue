<template>
  <v-dialog :model-value="modelValue" max-width="640" @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ $t('logs.detailTitle') }}</v-card-title>
      <v-card-text>
        <template v-if="log">
          <v-row dense>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">{{ $t('logs.time') }}</div>
              <div class="text-caption font-mono">{{ formatDateTime(log.timestamp) }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">{{ $t('logs.role') }}</div>
              <div>{{ log.actor?.role ? $t(`role.${log.actor.role}`) : '-' }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">{{ $t('logs.actor') }}</div>
              <div>{{ log.actor?.username ?? log.actor?.userId ?? '-' }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">{{ $t('logs.action') }}</div>
              <div>{{ actionLabel(log.action) }}</div>
            </v-col>
          </v-row>

          <div class="mt-4">
            <div class="text-caption text-medium-emphasis mb-1">{{ $t('logs.metadata') }}</div>
            <pre class="text-caption font-mono metadata-block">{{
              JSON.stringify(log.metadata, null, 2)
            }}</pre>
          </div>
        </template>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" @click="close">{{
          $t('common.cancel')
        }}</ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import type { AuditLog } from '@saas-starter-kit/shared';

defineProps<{
  modelValue: boolean;
  log: AuditLog | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { actionLabel } = useAuditActionLabel();

function close() {
  emit('update:modelValue', false);
}
</script>

<style scoped>
.metadata-block {
  white-space: pre-wrap;
  word-break: break-all;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 4px;
  padding: 12px;
  max-height: 320px;
  overflow-y: auto;
}
</style>
