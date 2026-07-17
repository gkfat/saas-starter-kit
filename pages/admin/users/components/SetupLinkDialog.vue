<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close">
    <v-card>
      <v-card-title class="pa-4">{{ $t('users.setupLinkTitle') }}</v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-3">{{ $t('users.setupLinkHint') }}</p>
        <v-text-field :model-value="link" readonly density="compact" />
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn color="secondary" variant="flat" class="border" @click="copyLink">{{
          $t('users.copyLink')
        }}</v-btn>
        <v-btn color="primary" variant="flat" @click="close">{{ $t('common.confirm') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  link: string | null;
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
