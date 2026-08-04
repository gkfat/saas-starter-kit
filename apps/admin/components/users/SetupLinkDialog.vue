<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ title ?? $t('users.setupLinkTitle') }}</v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-3">{{ hint ?? $t('users.setupLinkHint') }}</p>
        <v-text-field :model-value="link" readonly density="compact" />
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="primary" color="secondary" @click="copyLink">{{
          $t('users.copyLink')
        }}</ButtonsAppButton>
        <ButtonsAppButton kind="primary" @click="close">{{
          $t('common.confirm')
        }}</ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  link: string | null;
  title?: string;
  hint?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { showSuccess } = useToast();
const { t } = useI18n();

function close() {
  emit('update:modelValue', false);
}

async function copyLink() {
  if (!props.link) return;
  await navigator.clipboard.writeText(props.link);
  showSuccess(t('common.copied'));
}
</script>
