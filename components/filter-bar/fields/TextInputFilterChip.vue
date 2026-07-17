<template>
  <v-menu v-model="menuOpen" :close-on-content-click="false" transition="scale-transition" offset-y>
    <template #activator="{ props: menuProps }">
      <v-chip
        v-bind="menuProps"
        variant="outlined"
        class="filter-chip"
        :class="{ 'filter-chip--active': hasValue }"
        :prepend-icon="field.icon"
        label
      >
        {{ displayText }}
      </v-chip>
    </template>
    <v-card min-width="240">
      <v-card-text>
        <v-text-field
          v-model="tempValue"
          :label="field.label"
          :placeholder="field.placeholder"
          variant="outlined"
          density="compact"
          hide-details="auto"
          clearable
          prepend-inner-icon="mdi-magnify"
          :error-messages="validationError"
          @keyup.enter="applyValue"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="cancelValue">{{ $t('common.cancel') }}</v-btn>
        <v-btn variant="text" color="primary" @click="applyValue">{{
          $t('filterBar.apply')
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import type { TextInputFilterField } from '~/components/filter-bar/types';

const props = defineProps<{ field: TextInputFilterField }>();
const emit = defineEmits<{ update: [value: string | undefined] }>();

const modelValue = defineModel<string | undefined>('modelValue');

const menuOpen = ref(false);
const tempValue = ref<string>();

const hasValue = computed(() => !!modelValue.value && modelValue.value.trim() !== '');

const displayText = computed(() =>
  hasValue.value ? modelValue.value : props.field.placeholder || props.field.label,
);

const validationError = computed(() => {
  if (!props.field.validation || !tempValue.value) return '';
  const result = props.field.validation(tempValue.value);
  return typeof result === 'string' ? result : '';
});

watch(menuOpen, (isOpen) => {
  if (isOpen) tempValue.value = modelValue.value;
});

function applyValue() {
  if (validationError.value) return;
  const finalValue = tempValue.value?.trim() || undefined;
  modelValue.value = finalValue;
  emit('update', finalValue);
  menuOpen.value = false;
}

function cancelValue() {
  tempValue.value = modelValue.value;
  menuOpen.value = false;
}
</script>

<style scoped lang="scss">
.filter-chip {
  transition: all 0.2s ease;

  &--active {
    background-color: rgba(var(--v-theme-primary), 0.1);
    border-color: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-primary));
  }

  &:hover {
    background-color: rgba(var(--v-theme-on-surface), 0.04);
  }
}
</style>
